"use client";

/**
 * H11: la barra lateral del proyecto. "Proyecto" (la información del proyecto) y un acordeón
 * por tipo de elemento versionable: las historias de usuario, y los diagramas de
 * actividades en árbol (cada diagrama con sus actividades, y cada actividad con
 * sus internas, en todos los niveles). Muestra lo del build que se está mirando.
 *
 * - Un solo acordeón abierto a la vez. La barra tiene un alto fijo que no cambia al
 *   abrir o cerrar acordeones (al costado: el alto de la ventana menos la cabecera;
 *   en el panel deslizable de pantallas angostas: todo el panel). El abierto ocupa
 *   lo que dejan libre los títulos y, si su contenido no entra, se desplaza adentro
 *   (lo resuelve el flex, sin medir alturas). Si la ventana es tan baja que ni eso
 *   entra, el acordeón abierto conserva un alto mínimo y la barra entera se
 *   desplaza por dentro: nada se dibuja fuera de ella.
 * - Cada nivel del árbol se pliega y despliega. Arranca plegado, salvo el camino
 *   hasta el elemento elegido, que se abre solo cada vez que cambia la selección.
 * - Cada acordeón tiene un filtro y, a su derecha, el botón + para crear un elemento.
 *   Al filtrar el árbol se ven las coincidencias y las actividades que las contienen,
 *   con esas ramas desplegadas; el plegado propio del usuario no se toca, así que al
 *   borrar el filtro el árbol vuelve a como estaba.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ancestros, type Actividad } from "@/lib/documentacion";
import { cn, contieneTexto } from "@/lib/utils";

export type Seleccion = { tipo: "proyecto" } | { tipo: "historia"; id: string } | { tipo: "actividad"; id: string };

type Acordeon = "historias" | "diagramas";

const porNombre = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, "es");

const textos: Record<Acordeon, { crear: string; filtrar: string; sinCoincidencias: string }> = {
  historias: { crear: "Nueva historia", filtrar: "Filtrar historias de usuario", sinCoincidencias: "No hay historias que coincidan." },
  diagramas: { crear: "Nuevo diagrama", filtrar: "Filtrar diagramas y actividades", sinCoincidencias: "No hay actividades que coincidan." },
};

export function BarraLateral({
  historias,
  actividades,
  seleccion,
  soloLectura,
  onSeleccionar,
  onNuevaHistoria,
  onNuevoDiagrama,
  prefijo = "barra",
}: {
  historias: { id: string; titulo: string }[];
  actividades: Actividad[];
  seleccion: Seleccion;
  soloLectura: boolean;
  onSeleccionar: (seleccion: Seleccion) => void;
  onNuevaHistoria: () => void;
  onNuevoDiagrama: () => void;
  // Para los ids: la barra se dibuja al costado y, en pantallas angostas, en el panel deslizable.
  prefijo?: string;
}) {
  const [abierto, setAbierto] = useState<Acordeon | null>(seleccion.tipo === "actividad" ? "diagramas" : "historias");
  const [desplegadas, setDesplegadas] = useState<Set<string>>(
    () => new Set(seleccion.tipo === "actividad" ? ancestros(actividades, seleccion.id) : []),
  );

  // Elegir un elemento (desde la barra, el lienzo o al crearlo) abre su acordeón
  // y el camino hasta él en el árbol. Solo reacciona al cambio de selección, así
  // no se vuelve a abrir lo que el usuario plegó a mano.
  const claveSeleccion = seleccion.tipo === "proyecto" ? "proyecto" : `${seleccion.tipo}:${seleccion.id}`;
  useEffect(() => {
    if (seleccion.tipo === "historia") setAbierto("historias");
    if (seleccion.tipo === "actividad") {
      setAbierto("diagramas");
      const camino = ancestros(actividades, seleccion.id);
      if (camino.length > 0) setDesplegadas((previas) => new Set([...previas, ...camino]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver el comentario de arriba
  }, [claveSeleccion]);

  // Con el camino ya abierto, el elemento elegido se lleva a la vista dentro del
  // acordeón (en un árbol largo podía quedar fuera de lo visible).
  const barraRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const cuadro = requestAnimationFrame(() =>
      barraRef.current?.querySelector('[role="region"] [aria-current="true"]')?.scrollIntoView({ block: "nearest" }),
    );
    return () => cancelAnimationFrame(cuadro);
  }, [claveSeleccion]);

  const hijas = new Map<string | null, Actividad[]>();
  // H16: los nodos de control solo se ven en el lienzo, no en la barra.
  for (const a of actividades) if (a.tipo === "ACTIVIDAD") hijas.set(a.padreId, [...(hijas.get(a.padreId) ?? []), a]);

  // El filtro de cada acordeón (H11).
  const [filtros, setFiltros] = useState<Record<Acordeon, string>>({ historias: "", diagramas: "" });
  const filtroHistorias = filtros.historias.trim();
  const filtroDiagramas = filtros.diagramas.trim();
  // Lo que el usuario pliega mientras filtra; se olvida al cambiar el texto.
  const [plegadasEnFiltro, setPlegadasEnFiltro] = useState<Set<string>>(new Set());
  const cambiarFiltro = (acordeon: Acordeon, texto: string) => {
    setFiltros((previos) => ({ ...previos, [acordeon]: texto }));
    if (acordeon === "diagramas") setPlegadasEnFiltro(new Set());
  };

  // Al filtrar el árbol: las actividades que coinciden y las que las contienen. Las
  // contenedoras se ven desplegadas.
  const nombreDe = (a: Actividad) => a.nombre || "Sin nombre";
  let visibles: Set<string> | null = null;
  const contenedoras = new Set<string>();
  if (filtroDiagramas) {
    visibles = new Set();
    for (const a of actividades) {
      if (a.tipo !== "ACTIVIDAD" || !contieneTexto(nombreDe(a), filtroDiagramas)) continue;
      visibles.add(a.id);
      for (const ancestro of ancestros(actividades, a.id)) {
        visibles.add(ancestro);
        contenedoras.add(ancestro);
      }
    }
  }

  const elegida = (tipo: "historia" | "actividad", id: string) => seleccion.tipo === tipo && seleccion.id === id;

  const alternarAcordeon = (acordeon: Acordeon) => setAbierto((actual) => (actual === acordeon ? null : acordeon));

  const alternarRama = (id: string) =>
    setDesplegadas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });

  const enlace = (texto: string, activo: boolean, alElegir: () => void) => (
    <button
      type="button"
      // El nombre completo al pasar el mouse: los largos se cortan en dos líneas.
      title={texto}
      aria-current={activo ? "true" : undefined}
      onClick={alElegir}
      className={cn(
        "flex min-w-0 flex-1 items-center rounded-md px-2 py-1.5 text-left text-sm",
        activo ? "bg-secondary font-semibold text-secondary-foreground" : "text-foreground hover:bg-muted",
      )}
    >
      <span className="line-clamp-2 min-w-0 flex-1 break-words">{texto}</span>
    </button>
  );

  // Sin sangría: las internas se listan debajo de su actividad, alineadas con ella.
  // La flecha girada de la actividad indica que está desplegada.
  const arbol = (padreId: string | null): ReactNode => {
    const internas = (id: string | null) => (hijas.get(id) ?? []).filter((a) => !visibles || visibles.has(a.id));
    const lista = [...internas(padreId)].sort(porNombre);
    if (lista.length === 0) return null;
    return (
      <ul className="flex flex-col gap-0.5">
        {lista.map((a) => {
          const nombre = nombreDe(a);
          const tieneInternas = internas(a.id).length > 0;
          const desplegada = visibles ? contenedoras.has(a.id) && !plegadasEnFiltro.has(a.id) : desplegadas.has(a.id);
          return (
            <li key={a.id}>
              <div className="flex items-start">
                {tieneInternas ? (
                  <button
                    type="button"
                    aria-expanded={desplegada}
                    aria-label={`${desplegada ? "Plegar" : "Desplegar"} ${nombre}`}
                    onClick={() =>
                      visibles
                        ? setPlegadasEnFiltro((previas) => {
                            const nuevas = new Set(previas);
                            if (nuevas.has(a.id)) nuevas.delete(a.id);
                            else nuevas.add(a.id);
                            return nuevas;
                          })
                        : alternarRama(a.id)
                    }
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <span aria-hidden="true" className={cn("text-xs transition-transform", desplegada && "rotate-90")}>
                      ▶
                    </span>
                  </button>
                ) : (
                  <span aria-hidden="true" className="h-6 w-6 shrink-0" />
                )}
                {enlace(nombre, elegida("actividad", a.id), () => onSeleccionar({ tipo: "actividad", id: a.id }))}
              </div>
              {tieneInternas && desplegada && arbol(a.id)}
            </li>
          );
        })}
      </ul>
    );
  };

  const herramientas = (acordeon: Acordeon, alCrear: () => void) => (
    <div className="flex shrink-0 items-center gap-2">
      <input
        type="search"
        aria-label={textos[acordeon].filtrar}
        placeholder="Filtrar…"
        value={filtros[acordeon]}
        onChange={(e) => cambiarFiltro(acordeon, e.target.value)}
        className="h-9 min-w-0 flex-1 rounded-[var(--radius)] border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground"
      />
      {!soloLectura && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-9 shrink-0 px-0 text-lg"
          title={textos[acordeon].crear}
          aria-label={textos[acordeon].crear}
          onClick={alCrear}
        >
          <span aria-hidden="true">+</span>
        </Button>
      )}
    </div>
  );
  const sinCoincidencias = (acordeon: Acordeon) => <p className="px-2 text-sm text-muted-foreground">{textos[acordeon].sinCoincidencias}</p>;

  const historiasFiltradas = historias.filter((h) => contieneTexto(h.titulo || "Historia sin título", filtroHistorias));

  const seccion = (acordeon: Acordeon, titulo: string, accion: ReactNode, contenido: ReactNode) => {
    const estaAbierto = abierto === acordeon;
    return (
      <section className={cn("flex shrink-0 flex-col border-t pt-2", estaAbierto && "min-h-[11rem] flex-1 shrink")}>
        <h2>
          <button
            type="button"
            id={`${prefijo}-${acordeon}-titulo`}
            aria-expanded={estaAbierto}
            aria-controls={`${prefijo}-${acordeon}`}
            onClick={() => alternarAcordeon(acordeon)}
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {titulo}
            <span aria-hidden="true" className={cn("transition-transform", estaAbierto && "rotate-180")}>
              ▾
            </span>
          </button>
        </h2>
        {estaAbierto && (
          <div
            id={`${prefijo}-${acordeon}`}
            role="region"
            aria-labelledby={`${prefijo}-${acordeon}-titulo`}
            className="flex min-h-0 flex-1 flex-col gap-2 pt-1"
          >
            {accion}
            {/* Lo único que se desplaza: el filtro y el botón de crear quedan siempre a la vista. */}
            <div className="min-h-0 flex-1 overflow-y-auto">{contenido}</div>
          </div>
        )}
      </section>
    );
  };

  return (
    <nav
      ref={barraRef}
      aria-label="Elementos del proyecto"
      className="flex h-full flex-col gap-2 overflow-y-auto rounded-[var(--radius)] border bg-card p-3 md:h-[calc(100vh-12rem)]"
    >
      {/* Mismo estilo que los títulos de los acordeones: los tres están al mismo nivel. */}
      <button
        type="button"
        aria-current={seleccion.tipo === "proyecto" ? "true" : undefined}
        onClick={() => onSeleccionar({ tipo: "proyecto" })}
        className={cn(
          "w-full shrink-0 rounded-md px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide",
          seleccion.tipo === "proyecto" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        Proyecto
      </button>

      {seccion(
        "historias",
        "Historias de usuario",
        herramientas("historias", onNuevaHistoria),
        historias.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">Todavía no hay historias.</p>
        ) : historiasFiltradas.length === 0 ? (
          sinCoincidencias("historias")
        ) : (
          <ul className="flex flex-col gap-0.5">
            {[...historiasFiltradas]
              .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"))
              .map((h) => (
                <li key={h.id} className="flex">
                  {enlace(h.titulo || "Historia sin título", elegida("historia", h.id), () => onSeleccionar({ tipo: "historia", id: h.id }))}
                </li>
              ))}
          </ul>
        ),
      )}

      {seccion(
        "diagramas",
        "Diagramas de actividades",
        herramientas("diagramas", onNuevoDiagrama),
        arbol(null) ??
          (visibles ? sinCoincidencias("diagramas") : <p className="px-2 text-sm text-muted-foreground">Todavía no hay diagramas.</p>),
      )}
    </nav>
  );
}
