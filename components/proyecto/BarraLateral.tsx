"use client";

/**
 * H11: la barra lateral del proyecto. Una sección por tipo de elemento
 * versionable: las historias de usuario, y los diagramas en árbol (cada diagrama
 * con sus actividades, y cada actividad con sus internas, en todos los niveles).
 * Muestra lo del build que se está mirando.
 */
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Actividad } from "@/lib/documentacion";
import { cn } from "@/lib/utils";

export type Seleccion = { tipo: "proyecto" } | { tipo: "historia"; id: string } | { tipo: "actividad"; id: string };

const porNombre = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, "es");

export function BarraLateral({
  historias,
  actividades,
  seleccion,
  soloLectura,
  onSeleccionar,
  onNuevaHistoria,
  onNuevoDiagrama,
}: {
  historias: { id: string; titulo: string }[];
  actividades: Actividad[];
  seleccion: Seleccion;
  soloLectura: boolean;
  onSeleccionar: (seleccion: Seleccion) => void;
  onNuevaHistoria: () => void;
  onNuevoDiagrama: () => void;
}) {
  const hijas = new Map<string | null, Actividad[]>();
  for (const a of actividades) hijas.set(a.padreId, [...(hijas.get(a.padreId) ?? []), a]);

  const elegida = (tipo: "historia" | "actividad", id: string) => seleccion.tipo === tipo && seleccion.id === id;

  const enlace = (texto: string, activo: boolean, alElegir: () => void, extra?: ReactNode) => (
    <button
      type="button"
      aria-current={activo ? "true" : undefined}
      onClick={alElegir}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
        activo ? "bg-secondary font-semibold text-secondary-foreground" : "text-foreground hover:bg-muted",
      )}
    >
      <span className="line-clamp-2 break-words">{texto}</span>
      {extra}
    </button>
  );

  const arbol = (padreId: string | null, nivel: number): ReactNode => {
    const lista = [...(hijas.get(padreId) ?? [])].sort(porNombre);
    if (lista.length === 0) return null;
    return (
      <ul className={cn("flex flex-col gap-0.5", nivel > 0 && "ml-3 border-l pl-2")}>
        {lista.map((a) => {
          const internas = hijas.get(a.id)?.length ?? 0;
          return (
            <li key={a.id}>
              {enlace(a.nombre || "Sin nombre", elegida("actividad", a.id), () => onSeleccionar({ tipo: "actividad", id: a.id }), internas > 0 ? (
                <span className="shrink-0 text-xs text-muted-foreground">{internas}</span>
              ) : undefined)}
              {arbol(a.id, nivel + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <nav aria-label="Elementos del proyecto" className="flex flex-col gap-5 rounded-[var(--radius)] border bg-card p-3">
      {enlace("Información del proyecto", seleccion.tipo === "proyecto", () => onSeleccionar({ tipo: "proyecto" }))}

      <section aria-labelledby="barra-historias" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 px-2">
          <h2 id="barra-historias" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Historias de usuario
          </h2>
          <span className="text-xs text-muted-foreground">{historias.length}</span>
        </div>
        {historias.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">Todavía no hay historias.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {[...historias]
              .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"))
              .map((h) => (
                <li key={h.id}>
                  {enlace(h.titulo || "Historia sin título", elegida("historia", h.id), () => onSeleccionar({ tipo: "historia", id: h.id }))}
                </li>
              ))}
          </ul>
        )}
        {!soloLectura && (
          <Button type="button" size="sm" variant="outline" onClick={onNuevaHistoria}>
            Nueva historia
          </Button>
        )}
      </section>

      <section aria-labelledby="barra-diagramas" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 px-2">
          <h2 id="barra-diagramas" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Diagramas
          </h2>
          <span className="text-xs text-muted-foreground">{hijas.get(null)?.length ?? 0}</span>
        </div>
        {arbol(null, 0) ?? <p className="px-2 text-sm text-muted-foreground">Todavía no hay diagramas.</p>}
        {!soloLectura && (
          <Button type="button" size="sm" variant="outline" onClick={onNuevoDiagrama}>
            Nuevo diagrama
          </Button>
        )}
      </section>
    </nav>
  );
}
