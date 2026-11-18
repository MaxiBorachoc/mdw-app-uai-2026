"use client";

/**
 * El espacio de trabajo de un proyecto (docs/spec.md, sección 5): barra lateral
 * con los elementos (H11), panel con el elegido (H3 a H7, H10, H16, H17), selector de
 * versión y cierre (H8, H9) y el borrador con "Confirmar cambios" (H12).
 *
 * Es "use client" porque el borrador vive en el navegador. Los datos confirmados
 * llegan como props desde la página (Server Component, que lee lib/db). Después
 * de confirmar, o cuando otros confirman y no hay borrador, se pide la página de
 * nuevo con router.refresh(); las nuevas props reinician o rebasan el borrador.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { RolProyecto } from "@prisma/client";
import { BarraLateral, type Seleccion } from "@/components/proyecto/BarraLateral";
import { BarraProyecto, type BuildResumen, type EstadoConfirmar } from "@/components/proyecto/BarraProyecto";
import { DialogoCambiosDeOtros, type CambioDeOtroVista } from "@/components/proyecto/DialogoCambiosDeOtros";
import { DialogoCerrarVersion } from "@/components/proyecto/DialogoCerrarVersion";
import { DialogoColaboradores } from "@/components/proyecto/DialogoColaboradores";
import { lugarLibre } from "@/components/proyecto/LienzoDiagrama";
import { PanelActividad } from "@/components/proyecto/PanelActividad";
import { PanelHistoria } from "@/components/proyecto/PanelHistoria";
import { PanelProyecto } from "@/components/proyecto/PanelProyecto";
import { Alert } from "@/components/ui/alert";
import { HojaLateral } from "@/components/ui/hoja-lateral";
import { Button } from "@/components/ui/button";
import {
  alcanceDeEliminacion,
  cambiarPadre,
  cambiosParaConfirmar,
  crearActividad,
  crearCarril,
  crearBorrador,
  crearConexion,
  crearHistoria,
  editarActividad,
  editarCarril,
  editarGuarda,
  editarHistoria,
  elementosModificados,
  eliminarActividad,
  eliminarCarril,
  eliminarConexion,
  eliminarHistoria,
  flechasDeActividad,
  hayCambios,
  idNuevo,
  rebasar,
  vista,
  type Borrador,
} from "@/lib/borrador";
import {
  ancestros,
  esNodoDeControl,
  motivoFlechaNoPermitida,
  nombreCarrilLibre,
  nombreNodo,
  PREFIJO_NUEVO,
  puedeMoverA,
  type ElementoConProblema,
  type Estado,
  type HistoriaContenido,
} from "@/lib/documentacion";
import { contenidoActividadSchema } from "@/lib/schemas/actividad";
import { carrilEnBorradorSchema } from "@/lib/schemas/carril";
import { contenidoHistoriaSchema } from "@/lib/schemas/historiaUsuario";
import type { EntregableVista } from "@/lib/schemas/entregable";
import type { DefinicionProyecto } from "@/lib/schemas/proyecto";
import type { CerrarVersionProyectoInput } from "@/lib/schemas/versionProyecto";
import { cantidad } from "@/lib/utils";

const CONSULTA_CADA_MS = 5_000;
// Margen al consultar cambios de otros: una confirmación larga puede quedar con una
// fecha anterior a la última consulta. Lo repetido se descarta por elemento+versión.
const SOLAPAMIENTO_MS = 30_000;
// H17: el ancho con el que nace un carril (después se cambia arrastrando sus bordes).
const ANCHO_CARRIL_NUEVO = 320;

type Mensaje = { variante: "info" | "warning" | "error"; titulo: string; lineas: string[]; actualizar?: boolean };

const tipoTexto: Record<ElementoConProblema["tipo"], string> = { HISTORIA: "Historia", ACTIVIDAD: "Actividad", CONEXION: "Flecha", CARRIL: "Carril" };

export function EspacioProyecto({
  proyecto,
  miembros,
  rol,
  builds,
  buildVisto,
  estado,
  desde,
  entregables,
  hoy,
  finalizado,
  vistaActual,
}: {
  proyecto: { id: string; ownerNombre: string; creadoEn: string; definicion: DefinicionProyecto };
  miembros: { id: string; nombre: string; email: string; rol: RolProyecto }[];
  rol: RolProyecto;
  builds: BuildResumen[];
  buildVisto: BuildResumen;
  estado: Estado;
  desde: string;
  entregables: EntregableVista[];
  // La fecha de hoy en Argentina, calculada en el servidor (estado de los entregables).
  hoy: string;
  // H15: el proyecto no tiene build en desarrollo; la versión actual es la última cerrada.
  finalizado: boolean;
  // Se mira la versión actual (sin ?build), no una versión cerrada elegida en el selector.
  vistaActual: boolean;
}) {
  const router = useRouter();
  const cerrada = buildVisto.estado === "CERRADA";
  const puedeEditar = !cerrada && rol !== "READER";
  // H2, H13 y H14: colaboradores, definición y entregables los edita solo el dueño.
  // En un proyecto finalizado el dueño los sigue editando desde la versión actual (H15).
  const puedeEditarProyecto = vistaActual && rol === "OWNER";

  const [borrador, setBorrador] = useState<Borrador>(() => crearBorrador(estado));
  const [seleccion, setSeleccion] = useState<Seleccion>({ tipo: "proyecto" });
  const [nodoElegido, setNodoElegido] = useState<string | null>(null);
  // H17: en el lienzo se elige un nodo o un carril, no los dos.
  const [carrilElegido, setCarrilElegido] = useState<string | null>(null);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [cambiosDeOtros, setCambiosDeOtros] = useState<CambioDeOtroVista[]>([]);
  const [verCambios, setVerCambios] = useState(false);
  const [cierreAbierto, setCierreAbierto] = useState(false);
  // H15: la ventana de cierre también se usa para finalizar el proyecto.
  const [modoCierre, setModoCierre] = useState<"cerrar" | "finalizar">("cerrar");
  const [colaboradoresAbierto, setColaboradoresAbierto] = useState(false);
  // H11: en pantallas angostas la barra lateral se abre como panel deslizable.
  const [elementosAbierto, setElementosAbierto] = useState(false);
  const [flechaResaltada, setFlechaResaltada] = useState<string | null>(null);

  const avisoRef = useRef<HTMLDivElement>(null);
  const borradorRef = useRef(borrador);
  borradorRef.current = borrador;
  const estadoPrevio = useRef(estado);
  const reiniciarAlRecibir = useRef(false);
  const idsNuevos = useRef<Record<string, string>>({});
  const cursor = useRef(desde);
  const primeraConsulta = useRef(true);
  const vistos = useRef(new Set<string>());

  const v = useMemo(() => vista(borrador), [borrador]);
  const conCambios = useMemo(() => hayCambios(borrador), [borrador]);
  const modificados = useMemo(() => elementosModificados(borrador), [borrador]);
  const conflictos = useMemo(
    () => new Set(cambiosDeOtros.map((c) => c.elementoId).filter((id) => modificados.has(id))),
    [cambiosDeOtros, modificados],
  );
  const estadoConfirmar: EstadoConfirmar = conflictos.size > 0 ? "conflicto" : conCambios ? "con-cambios" : "sin-cambios";

  // --- Datos confirmados nuevos (después de confirmar, actualizar o refrescar) ------------
  useEffect(() => {
    if (estado === estadoPrevio.current) return;
    estadoPrevio.current = estado;
    // Los datos nuevos ya traen los cambios de otros que se venían avisando.
    setCambiosDeOtros([]);
    setVerCambios(false);
    const actual = borradorRef.current;
    if (reiniciarAlRecibir.current || !hayCambios(actual)) {
      reiniciarAlRecibir.current = false;
      setBorrador(crearBorrador(estado));
      const mapa = idsNuevos.current;
      idsNuevos.current = {};
      setSeleccion((s) => {
        const definitivo = s.tipo !== "proyecto" ? mapa[s.id] : undefined;
        return s.tipo !== "proyecto" && definitivo ? { ...s, id: definitivo } : s;
      });
      setNodoElegido((n) => (n ? (mapa[n] ?? n) : n));
      return;
    }
    const { borrador: rebasado, descartados } = rebasar(actual, estado);
    setBorrador(rebasado);
    if (descartados.length > 0) {
      const nombres = descartados.map((id) => nombreEn(estado, id));
      setMensaje({
        variante: "warning",
        titulo: "Se descartaron algunos de tus cambios",
        lineas: [`Otro usuario modificó o eliminó: ${nombres.join(", ")}. El resto de tu borrador se conservó.`],
      });
    }
  }, [estado]);

  // --- Cambios de otros usuarios (H12) ------------------------------------------------
  useEffect(() => {
    if (cerrada) return;
    const consultar = async () => {
      if (document.hidden) return;
      const margen = primeraConsulta.current ? 0 : SOLAPAMIENTO_MS;
      const desdeConMargen = new Date(new Date(cursor.current).getTime() - margen).toISOString();
      try {
        const respuesta = await fetch(`/api/proyectos/${proyecto.id}/cambios?desde=${encodeURIComponent(desdeConMargen)}`);
        if (!respuesta.ok) return;
        const datos: { cambios: CambioDeOtroVista[]; ahora: string } = await respuesta.json();
        primeraConsulta.current = false;
        cursor.current = datos.ahora;
        const nuevos = datos.cambios.filter((c) => !vistos.current.has(`${c.elementoId}:${c.numeroVersion}`));
        for (const c of nuevos) vistos.current.add(`${c.elementoId}:${c.numeroVersion}`);
        if (nuevos.length === 0) return;
        // Sin borrador, la pantalla se actualiza sola; con borrador, se avisa.
        if (hayCambios(borradorRef.current)) setCambiosDeOtros((previos) => [...previos, ...nuevos]);
        else router.refresh();
      } catch {
        // Sin red: se reintenta en la próxima vuelta.
      }
    };
    const intervalo = setInterval(consultar, CONSULTA_CADA_MS);
    return () => clearInterval(intervalo);
  }, [cerrada, proyecto.id, router]);

  // Un aviso nuevo se lleva a la vista: si la página estaba desplazada, quedaba oculto.
  useEffect(() => {
    if (mensaje) avisoRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [mensaje]);

  // Avisar antes de cerrar la pestaña con cambios sin confirmar.
  useEffect(() => {
    if (!conCambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [conCambios]);

  // --- Lecturas sobre lo que se ve ---------------------------------------------------
  const nombreDe = useCallback((id: string) => nombreEn(borrador.actual, id), [borrador.actual]);
  const rutaDe = useCallback(
    (id: string) => [...ancestros(v.actividades, id).reverse(), id].map((x) => ({ id: x, nombre: nombreEn(v, x) })),
    [v],
  );
  const rutaTexto = useCallback((id: string) => rutaDe(id).map((p) => p.nombre).join(" / "), [rutaDe]);
  const padresPosibles = useCallback(
    (id: string) =>
      v.actividades
        // H16: un nodo de control no tiene diagrama interno: no puede ser padre.
        .filter((p) => p.tipo === "ACTIVIDAD" && p.id !== id && puedeMoverA(v.actividades, id, p.id))
        .map((p) => ({ id: p.id, nombre: p.nombre, ruta: rutaTexto(p.id) })),
    [v, rutaTexto],
  );

  const historiaElegida = seleccion.tipo === "historia" ? v.historias.find((h) => h.id === seleccion.id) : undefined;
  const actividadAbierta = seleccion.tipo === "actividad" ? v.actividades.find((a) => a.id === seleccion.id) : undefined;
  const nodo = nodoElegido ? v.actividades.find((a) => a.id === nodoElegido && a.padreId === actividadAbierta?.id) : undefined;
  const carril = carrilElegido ? v.carriles.find((c) => c.id === carrilElegido && c.diagramaId === actividadAbierta?.id) : undefined;

  // --- Gestos del borrador -----------------------------------------------------------
  const modificar = (cambio: (b: Borrador) => Borrador) => setBorrador((b) => cambio(b));

  const nuevaHistoria = () => {
    const id = idNuevo();
    const titulos = new Set(v.historias.map((h) => h.titulo.trim().toLowerCase()));
    let titulo = "Nueva historia";
    for (let n = 2; titulos.has(titulo.toLowerCase()); n++) titulo = `Nueva historia ${n}`;
    modificar((b) => crearHistoria(b, id, { titulo, descripcion: "", criteriosAceptacion: [""] }));
    setSeleccion({ tipo: "historia", id });
  };

  const nuevoDiagrama = () => {
    const id = idNuevo();
    modificar((b) => crearActividad(b, id, { nombre: "Nuevo diagrama", padreId: null, posicionX: null, posicionY: null }));
    setSeleccion({ tipo: "actividad", id });
    setNodoElegido(null);
  };

  const irAActividad = (id: string) => {
    // H16: un nodo de control no se abre (no tiene diagrama interno): se muestra
    // elegido en el diagrama que lo contiene.
    const destino = v.actividades.find((a) => a.id === id);
    if (destino && esNodoDeControl(destino.tipo) && destino.padreId) {
      setSeleccion({ tipo: "actividad", id: destino.padreId });
      setNodoElegido(id);
      return;
    }
    setSeleccion({ tipo: "actividad", id });
    setNodoElegido(null);
  };

  const cambiarDePadre = (id: string, padreId: string | null) => {
    const actividad = v.actividades.find((a) => a.id === id);
    if (!actividad || actividad.padreId === padreId) return;
    const flechas = flechasDeActividad(borrador, id);
    if (flechas > 0 && !window.confirm(`Al mover “${actividad.nombre}” ${flechas === 1 ? "se le va a quitar su flecha" : `se le van a quitar sus ${flechas} flechas`}. ¿Continuar?`)) return;
    const hermanas = v.actividades.filter((a) => a.padreId === padreId).map((a) => ({ x: a.posicionX ?? 0, y: a.posicionY ?? 0 }));
    modificar((b) => cambiarPadre(b, id, padreId, lugarLibre(hermanas)));
    if (nodoElegido === id) setNodoElegido(null);
  };

  const eliminarUnaActividad = (id: string) => {
    const actividad = v.actividades.find((a) => a.id === id);
    if (!actividad) return;
    const alcance = alcanceDeEliminacion(borrador, id);
    const detalle = [
      alcance.actividades > 0 && cantidad(alcance.actividades, "actividad interna", "actividades internas"),
      alcance.flechas > 0 && cantidad(alcance.flechas, "flecha", "flechas"),
    ].filter(Boolean);
    const pregunta = `¿Eliminar “${nombreNodo(actividad)}”${detalle.length ? ` junto con ${detalle.join(" y ")}` : ""}? Se va a poder ver en las versiones cerradas anteriores.`;
    if (!window.confirm(pregunta)) return;
    modificar((b) => eliminarActividad(b, id));
    if (nodoElegido === id) setNodoElegido(null);
    if (actividadAbierta?.id === id) {
      setSeleccion(actividad.padreId ? { tipo: "actividad", id: actividad.padreId } : { tipo: "proyecto" });
    }
  };

  const eliminarUnaHistoria = (id: string) => {
    const historia = v.historias.find((h) => h.id === id);
    if (!historia) return;
    if (!window.confirm(`¿Eliminar la historia “${historia.titulo}”? Las actividades asociadas dejan de mostrarla. Se va a poder ver en las versiones cerradas anteriores.`)) return;
    modificar((b) => eliminarHistoria(b, id));
    setSeleccion({ tipo: "proyecto" });
  };

  const elegirNodo = (id: string | null) => {
    setNodoElegido(id);
    if (id) setCarrilElegido(null);
  };
  const elegirCarril = (id: string | null) => {
    setCarrilElegido(id);
    if (id) setNodoElegido(null);
  };

  // H17: el carril nuevo va pegado a la derecha del que está más a la derecha.
  const nuevoCarril = (diagramaId: string) => {
    const delDiagrama = v.carriles.filter((c) => c.diagramaId === diagramaId);
    const posicionX = delDiagrama.reduce((maximo, c) => Math.max(maximo, c.posicionX + c.ancho), 0);
    const id = idNuevo();
    const nombre = nombreCarrilLibre(delDiagrama.map((c) => c.nombre));
    modificar((b) => crearCarril(b, id, { diagramaId, nombre, posicionX, ancho: ANCHO_CARRIL_NUEVO }));
    elegirCarril(id);
  };

  const eliminarUnCarril = (id: string) => {
    const elegido = v.carriles.find((c) => c.id === id);
    if (!elegido) return;
    if (!window.confirm(`¿Eliminar el carril “${elegido.nombre}”? Los nodos que se ven sobre él no cambian. Se va a poder ver en las versiones cerradas anteriores.`)) return;
    modificar((b) => eliminarCarril(b, id));
    setCarrilElegido(null);
  };

  const conectar = (origenId: string, destinoId: string) => {
    // H16: las reglas de UML que se validan (el servidor las vuelve a controlar).
    const origen = v.actividades.find((a) => a.id === origenId);
    const destino = v.actividades.find((a) => a.id === destinoId);
    const motivo = origen && destino ? motivoFlechaNoPermitida(origen, destino) : null;
    if (motivo) {
      setMensaje({ variante: "warning", titulo: "No se puede crear esa flecha", lineas: [motivo] });
      return;
    }
    const { borrador: nuevo, existente } = crearConexion(borrador, idNuevo(), origenId, destinoId);
    if (existente) {
      setFlechaResaltada(existente);
      setTimeout(() => setFlechaResaltada(null), 2500);
      setMensaje({ variante: "info", titulo: "Esa flecha ya existe", lineas: ["No se crea otra con el mismo origen y destino: está resaltada en el diagrama."] });
      return;
    }
    setBorrador(nuevo);
  };

  // --- Confirmar, descartar, actualizar ------------------------------------------------
  const seleccionar = (e: { tipo: ElementoConProblema["tipo"]; id: string }) => {
    if (e.tipo === "HISTORIA") setSeleccion({ tipo: "historia", id: e.id });
    else if (e.tipo === "ACTIVIDAD") irAActividad(e.id);
    else if (e.tipo === "CARRIL") {
      // H17: se abre el diagrama del carril con el carril elegido.
      const elegido = borrador.actual.carriles.find((c) => c.id === e.id);
      if (elegido) {
        setSeleccion({ tipo: "actividad", id: elegido.diagramaId });
        elegirCarril(e.id);
      }
    }
  };

  const confirmar = async () => {
    const cambios = cambiosParaConfirmar(borrador);
    // Misma validación que el servidor, para marcar los campos antes de enviar.
    const problemas: ElementoConProblema[] = [
      ...cambios.historias
        .filter((h) => !h.eliminado)
        .flatMap((h) => {
          const r = contenidoHistoriaSchema.safeParse(h);
          return r.success ? [] : [{ tipo: "HISTORIA" as const, id: h.id, nombre: h.titulo || "Historia sin título", motivo: r.error.issues[0]?.message ?? "" }];
        }),
      ...cambios.actividades
        // Los nodos de control no tienen nombre ni documentación que validar (H16).
        .filter((a) => !a.eliminado && a.tipo === "ACTIVIDAD")
        .flatMap((a) => {
          const r = contenidoActividadSchema.safeParse(a);
          return r.success ? [] : [{ tipo: "ACTIVIDAD" as const, id: a.id, nombre: a.nombre || "Sin nombre", motivo: r.error.issues[0]?.message ?? "" }];
        }),
      ...cambios.carriles
        .filter((c) => !c.eliminado)
        .flatMap((c) => {
          const r = carrilEnBorradorSchema.safeParse(c);
          return r.success ? [] : [{ tipo: "CARRIL" as const, id: c.id, nombre: c.nombre || "Carril sin nombre", motivo: r.error.issues[0]?.message ?? "" }];
        }),
    ];
    if (problemas.length > 0) {
      setMostrarErrores(true);
      mostrarProblemas("error", "Revisá los campos marcados antes de confirmar", problemas);
      seleccionar(problemas[0]!);
      return;
    }

    setConfirmando(true);
    try {
      const respuesta = await fetch(`/api/proyectos/${proyecto.id}/cambios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (respuesta.ok) {
        idsNuevos.current = cuerpo?.ids ?? {};
        reiniciarAlRecibir.current = true;
        setMostrarErrores(false);
        setCambiosDeOtros([]);
        // Sin aviso de éxito: el botón vuelve a gris y cada elemento muestra su versión nueva.
        setMensaje(null);
        router.refresh();
      } else if (respuesta.status === 409 && cuerpo?.codigo === "CONFLICTO_DE_EDICION") {
        mostrarProblemas("warning", "Otro usuario cambió elementos de tu borrador", cuerpo.elementos ?? [], true);
      } else if (respuesta.status === 409 && cuerpo?.codigo === "REGLA_DE_DOCUMENTACION") {
        setMostrarErrores(true);
        mostrarProblemas("error", "Los cambios no respetan las reglas del proyecto", cuerpo.elementos ?? []);
        if (cuerpo.elementos?.[0]) seleccionar(cuerpo.elementos[0]);
      } else {
        setMensaje({ variante: "error", titulo: "No se pudieron confirmar los cambios", lineas: [cuerpo?.error ?? "Probá de nuevo en unos segundos."] });
      }
    } catch {
      setMensaje({ variante: "error", titulo: "No se pudieron confirmar los cambios", lineas: ["Revisá tu conexión y probá de nuevo. Tu borrador sigue intacto."] });
    } finally {
      setConfirmando(false);
    }
  };

  const mostrarProblemas = (variante: Mensaje["variante"], titulo: string, elementos: ElementoConProblema[], actualizar = false) =>
    setMensaje({
      variante,
      titulo,
      lineas: elementos.map((e) => `${tipoTexto[e.tipo]} ${e.nombre}: ${e.motivo}`),
      actualizar,
    });

  const descartar = () => {
    if (!window.confirm("¿Descartar todos los cambios sin confirmar?")) return;
    setBorrador(crearBorrador(borrador.confirmado));
    setMostrarErrores(false);
    setMensaje(null);
    if (cambiosDeOtros.length > 0) {
      setCambiosDeOtros([]);
      router.refresh();
    }
    if (seleccion.tipo !== "proyecto" && seleccion.id.startsWith(PREFIJO_NUEVO)) setSeleccion({ tipo: "proyecto" });
  };

  const actualizar = () => {
    setVerCambios(false);
    setCambiosDeOtros([]);
    setMensaje(null);
    router.refresh();
  };

  const navegar = () => !conCambios || window.confirm("Tenés cambios sin confirmar. Si cambiás de versión se pierden. ¿Continuar?");

  const cerrarVersion = async (datos: CerrarVersionProyectoInput): Promise<string | null> => {
    try {
      const respuesta = await fetch(`/api/proyectos/${proyecto.id}/cerrar-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) return cuerpo?.error ?? "Probá de nuevo en unos segundos.";
      setCierreAbierto(false);
      // Sin aviso de éxito: el selector ya muestra la versión cerrada.
      setMensaje(null);
      router.refresh();
      return null;
    } catch {
      return "Revisá tu conexión y probá de nuevo.";
    }
  };

  // --- H15: finalizar y reabrir el proyecto ---------------------------------------------
  const pedirAlProyecto = async (accion: "finalizar" | "reabrir", cuerpo?: unknown) => {
    const respuesta = await fetch(`/api/proyectos/${proyecto.id}/${accion}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo ?? {}),
    });
    const datos = await respuesta.json().catch(() => null);
    return { ok: respuesta.ok, codigo: datos?.codigo as string | undefined, error: datos?.error as string | undefined };
  };

  const abrirFinalizacionConCierre = () => {
    setModoCierre("finalizar");
    setCierreAbierto(true);
  };

  const finalizar = async () => {
    const enDesarrollo = builds.find((b) => b.estado === "EN_DESARROLLO");
    // Con cambios (propios sin confirmar o ya confirmados) se finaliza cerrando la versión.
    if (conCambios || enDesarrollo?.tieneCambios) return abrirFinalizacionConCierre();
    if (!ultimaCerrada) {
      setMensaje({ variante: "warning", titulo: "No hay nada que finalizar", lineas: ["El proyecto no tiene versiones cerradas ni cambios en la versión en desarrollo."] });
      return;
    }
    const pregunta = `¿Finalizar el proyecto? Queda en su última versión cerrada (${ultimaCerrada.etiqueta}) y nadie va a poder modificar la documentación hasta que lo reabras.`;
    if (!window.confirm(pregunta)) return;
    try {
      const r = await pedirAlProyecto("finalizar");
      if (r.ok) return router.refresh();
      // Otro usuario confirmó cambios mientras tanto: hay que cerrar la versión.
      if (r.codigo === "CIERRE_REQUERIDO") {
        router.refresh();
        return abrirFinalizacionConCierre();
      }
      setMensaje({ variante: "error", titulo: "No se pudo finalizar el proyecto", lineas: [r.error ?? "Probá de nuevo en unos segundos."] });
    } catch {
      setMensaje({ variante: "error", titulo: "No se pudo finalizar el proyecto", lineas: ["Revisá tu conexión y probá de nuevo."] });
    }
  };

  const finalizarConCierre = async (datos: CerrarVersionProyectoInput): Promise<string | null> => {
    try {
      const r = await pedirAlProyecto("finalizar", { cierre: datos });
      if (!r.ok) return r.error ?? "Probá de nuevo en unos segundos.";
      setCierreAbierto(false);
      router.refresh();
      return null;
    } catch {
      return "Revisá tu conexión y probá de nuevo.";
    }
  };

  const reabrir = async () => {
    if (!window.confirm("¿Reabrir el proyecto? Se abre una versión en desarrollo nueva para seguir documentando.")) return;
    try {
      const r = await pedirAlProyecto("reabrir");
      if (r.ok) return router.refresh();
      setMensaje({ variante: "error", titulo: "No se pudo reabrir el proyecto", lineas: [r.error ?? "Probá de nuevo en unos segundos."] });
    } catch {
      setMensaje({ variante: "error", titulo: "No se pudo reabrir el proyecto", lineas: ["Revisá tu conexión y probá de nuevo."] });
    }
  };

  const ultimaCerrada = builds.find((b) => b.estado === "CERRADA");
  const sugerencia = ultimaCerrada
    ? (() => {
        const [version, build, patch] = ultimaCerrada.etiqueta.split(".").map(Number);
        return { numeroVersion: version ?? 0, numeroBuild: build ?? 0, numeroPatch: (patch ?? 0) + 1 };
      })()
    : { numeroVersion: 0, numeroBuild: 0, numeroPatch: 1 };

  // --- Pantalla ------------------------------------------------------------------------
  const historiasLista = v.historias.map((h) => ({ id: h.id, titulo: h.titulo }));

  let panel: ReactNode;
  if (historiaElegida) {
    panel = (
      <PanelHistoria
        key={historiaElegida.id}
        proyectoId={proyecto.id}
        historia={historiaElegida}
        nueva={historiaElegida.id.startsWith(PREFIJO_NUEVO)}
        soloLectura={!puedeEditar}
        mostrarErrores={mostrarErrores}
        actividadesAsociadas={v.actividades
          .filter((a) => a.historiaIds.includes(historiaElegida.id))
          .map((a) => ({ id: a.id, nombre: a.nombre, ruta: rutaTexto(a.id) }))}
        nombreDe={nombreDe}
        onCambiar={(contenido: HistoriaContenido) => modificar((b) => editarHistoria(b, historiaElegida.id, contenido))}
        onEliminar={() => eliminarUnaHistoria(historiaElegida.id)}
        onIrAActividad={irAActividad}
      />
    );
  } else if (actividadAbierta) {
    const hijas = v.actividades.filter((a) => a.padreId === actividadAbierta.id);
    const idsHijas = new Set(hijas.map((a) => a.id));
    panel = (
      <PanelActividad
        proyectoId={proyecto.id}
        abierta={{
          actividad: actividadAbierta,
          nueva: actividadAbierta.id.startsWith(PREFIJO_NUEVO),
          padresPosibles: padresPosibles(actividadAbierta.id),
        }}
        nodoElegido={nodo ? { actividad: nodo, nueva: nodo.id.startsWith(PREFIJO_NUEVO), padresPosibles: padresPosibles(nodo.id) } : null}
        ruta={rutaDe(actividadAbierta.id)}
        soloLectura={!puedeEditar}
        mostrarErrores={mostrarErrores}
        historias={historiasLista}
        nodos={hijas.map((a) => ({
          id: a.id,
          tipo: a.tipo,
          nombre: a.nombre,
          x: a.posicionX ?? 0,
          y: a.posicionY ?? 0,
          internas: v.actividades.filter((x) => x.padreId === a.id && x.tipo === "ACTIVIDAD").length,
          historias: a.historiaIds.length,
        }))}
        flechas={v.conexiones.filter((c) => idsHijas.has(c.origenId))}
        flechaResaltada={flechaResaltada}
        nombreDe={nombreDe}
        onIrA={irAActividad}
        onCambiar={(id, cambio) => modificar((b) => editarActividad(b, id, cambio))}
        onCambiarPadre={cambiarDePadre}
        onEliminar={eliminarUnaActividad}
        onSeleccionarNodo={elegirNodo}
        onMoverNodo={(id, x, y) => modificar((b) => editarActividad(b, id, { posicionX: x, posicionY: y }))}
        onCrearNodo={(x, y, tipo) => {
          const id = idNuevo();
          const nombre = tipo === "ACTIVIDAD" ? "Nueva actividad" : "";
          modificar((b) => crearActividad(b, id, { tipo, nombre, padreId: actividadAbierta.id, posicionX: x, posicionY: y }));
          elegirNodo(id);
        }}
        onCambiarGuarda={(id, guarda) => modificar((b) => editarGuarda(b, id, guarda))}
        onConectar={conectar}
        onEliminarFlecha={(id) => modificar((b) => eliminarConexion(b, id))}
        carriles={v.carriles
          .filter((c) => c.diagramaId === actividadAbierta.id)
          .map((c) => ({ id: c.id, nombre: c.nombre, x: c.posicionX, ancho: c.ancho }))}
        carrilElegido={carril ? { carril, nuevo: carril.id.startsWith(PREFIJO_NUEVO) } : null}
        onSeleccionarCarril={elegirCarril}
        onCrearCarril={() => nuevoCarril(actividadAbierta.id)}
        onCambiarCarril={(id, cambio) => modificar((b) => editarCarril(b, id, cambio))}
        onEliminarCarril={eliminarUnCarril}
      />
    );
  } else {
    panel = (
      <PanelProyecto
        proyectoId={proyecto.id}
        definicion={proyecto.definicion}
        ownerNombre={proyecto.ownerNombre}
        creadoEn={proyecto.creadoEn}
        miembros={miembros}
        entregables={entregables}
        hoy={hoy}
        puedeEditarProyecto={puedeEditarProyecto}
        onVerColaboradores={() => setColaboradoresAbierto(true)}
        finalizado={finalizado}
        onFinalizar={() => void finalizar()}
        onReabrir={() => void reabrir()}
      />
    );
  }

  // La misma barra al costado y en el panel deslizable; en el panel, elegir o crear
  // un elemento lo cierra para mostrar el contenido.
  const barraLateral = (prefijo: string) => (
    <BarraLateral
      prefijo={prefijo}
      historias={historiasLista}
      actividades={v.actividades}
      seleccion={seleccion}
      soloLectura={!puedeEditar}
      onSeleccionar={(s) => {
        setSeleccion(s);
        setNodoElegido(null);
        setElementosAbierto(false);
      }}
      onNuevaHistoria={() => {
        nuevaHistoria();
        setElementosAbierto(false);
      }}
      onNuevoDiagrama={() => {
        nuevoDiagrama();
        setElementosAbierto(false);
      }}
    />
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
      <BarraProyecto
        proyectoId={proyecto.id}
        nombre={proyecto.definicion.nombre}
        rol={rol}
        builds={builds}
        buildVisto={buildVisto}
        puedeEditar={puedeEditar}
        finalizado={finalizado}
        vistaActual={vistaActual}
        estadoConfirmar={estadoConfirmar}
        confirmando={confirmando}
        cambiosDeOtros={cambiosDeOtros.length}
        onNavegar={navegar}
        onAbrirCierre={() => {
          setModoCierre("cerrar");
          setCierreAbierto(true);
        }}
        onVerCambios={() => setVerCambios(true)}
        onAbrirElementos={() => setElementosAbierto(true)}
        onConfirmar={confirmar}
        onDescartar={descartar}
      />

      {mensaje && (
        // scroll-mt deja el aviso por debajo de la barra fija al llevarlo a la vista.
        <div ref={avisoRef} className="mt-4 scroll-mt-28">
          <Alert variant={mensaje.variante}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{mensaje.titulo}</p>
                {mensaje.lineas.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {mensaje.lineas.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                {mensaje.actualizar && (
                  <Button type="button" size="sm" onClick={actualizar}>
                    Actualizar
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => setMensaje(null)}>
                  Cerrar aviso
                </Button>
              </div>
            </div>
          </Alert>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Desde 48rem la barra queda al costado, fija debajo de la barra del proyecto.
            En pantallas más angostas se abre con el botón "Elementos" (H11). */}
        <aside className="hidden md:sticky md:top-24 md:block md:self-start">{barraLateral("barra")}</aside>
        <section aria-label="Elemento elegido" className="min-w-0">
          {panel}
        </section>
      </div>

      <DialogoCambiosDeOtros
        abierto={verCambios}
        cambios={cambiosDeOtros}
        conflictos={conflictos}
        onActualizar={actualizar}
        onCerrar={() => setVerCambios(false)}
      />
      <HojaLateral abierto={elementosAbierto} titulo="Elementos del proyecto" onCerrar={() => setElementosAbierto(false)}>
        {barraLateral("hoja")}
      </HojaLateral>

      <DialogoColaboradores
        abierto={colaboradoresAbierto}
        proyectoId={proyecto.id}
        // En una versión cerrada toda la pantalla es de solo lectura (H9), también esta ventana.
        esDueno={puedeEditarProyecto}
        onCerrar={() => setColaboradoresAbierto(false)}
        onCambio={() => router.refresh()}
      />

      {cierreAbierto && (
        <DialogoCerrarVersion
          abierto={cierreAbierto}
          sugerencia={sugerencia}
          hayBorrador={conCambios}
          entregables={entregables}
          hoy={hoy}
          esDueno={rol === "OWNER"}
          modo={modoCierre}
          onCerrar={() => setCierreAbierto(false)}
          onConfirmar={modoCierre === "finalizar" ? finalizarConCierre : cerrarVersion}
        />
      )}
    </div>
  );
}

function nombreEn(estado: Estado, id: string): string {
  const historia = estado.historias.find((h) => h.id === id);
  if (historia) return historia.titulo || "Historia sin título";
  const actividad = estado.actividades.find((a) => a.id === id);
  if (actividad) return nombreNodo(actividad) || "Sin nombre";
  const carril = estado.carriles.find((c) => c.id === id);
  if (carril) return carril.nombre || "Carril sin nombre";
  return "(elemento eliminado)";
}
