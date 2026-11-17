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
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ancestros, type Actividad } from "@/lib/documentacion";
import { cn } from "@/lib/utils";

export type Seleccion = { tipo: "proyecto" } | { tipo: "historia"; id: string } | { tipo: "actividad"; id: string };

type Acordeon = "historias" | "diagramas";

const porNombre = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, "es");

// Árbol compacto: cada nivel suma 1rem de sangría hasta el nivel TOPE_SANGRIA; los
// más profundos dejan de correrse y muestran su nivel ("N7") para no perder la
// noción de profundidad. Así ningún nivel se queda sin lugar para el nombre.
const TOPE_SANGRIA = 5;

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

  const elegida = (tipo: "historia" | "actividad", id: string) => seleccion.tipo === tipo && seleccion.id === id;

  const alternarAcordeon = (acordeon: Acordeon) => setAbierto((actual) => (actual === acordeon ? null : acordeon));

  const alternarRama = (id: string) =>
    setDesplegadas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });

  const enlace = (texto: string, activo: boolean, alElegir: () => void, extra?: ReactNode) => (
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
      {extra}
    </button>
  );

  const arbol = (padreId: string | null, nivel: number): ReactNode => {
    const lista = [...(hijas.get(padreId) ?? [])].sort(porNombre);
    if (lista.length === 0) return null;
    return (
      <ul className="flex flex-col gap-0.5">
        {lista.map((a) => {
          const nombre = a.nombre || "Sin nombre";
          const tieneInternas = (hijas.get(a.id)?.length ?? 0) > 0;
          const desplegada = desplegadas.has(a.id);
          return (
            <li key={a.id}>
              {/* Sangría calculada según el nivel (valor de runtime: único estilo en línea). */}
              <div className="flex items-start" style={{ paddingLeft: `${Math.min(nivel, TOPE_SANGRIA)}rem` }}>
                {tieneInternas ? (
                  <button
                    type="button"
                    aria-expanded={desplegada}
                    aria-label={`${desplegada ? "Plegar" : "Desplegar"} ${nombre}`}
                    onClick={() => alternarRama(a.id)}
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <span aria-hidden="true" className={cn("text-xs transition-transform", desplegada && "rotate-90")}>
                      ▶
                    </span>
                  </button>
                ) : (
                  <span aria-hidden="true" className="h-6 w-6 shrink-0" />
                )}
                {enlace(
                  nombre,
                  elegida("actividad", a.id),
                  () => onSeleccionar({ tipo: "actividad", id: a.id }),
                  nivel > TOPE_SANGRIA && (
                    <span className="ml-1 shrink-0 rounded bg-muted px-1 text-xs text-muted-foreground">
                      <span className="sr-only">nivel </span>N{nivel + 1}
                    </span>
                  ),
                )}
              </div>
              {tieneInternas && desplegada && arbol(a.id, nivel + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

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
            {/* Lo único que se desplaza: el botón de crear queda siempre a la vista. */}
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
        !soloLectura && (
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={onNuevaHistoria}>
            Nueva historia
          </Button>
        ),
        historias.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">Todavía no hay historias.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {[...historias]
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
        !soloLectura && (
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={onNuevoDiagrama}>
            Nuevo diagrama
          </Button>
        ),
        arbol(null, 0) ?? <p className="px-2 text-sm text-muted-foreground">Todavía no hay diagramas.</p>,
      )}
    </nav>
  );
}
