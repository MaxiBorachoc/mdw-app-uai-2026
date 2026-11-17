"use client";

/**
 * La cabecera del espacio del proyecto: nombre y rol, el selector de versión
 * (H8, H9), el aviso de cambios de otros usuarios y "Confirmar cambios" (H12).
 *
 * "Confirmar cambios" está siempre visible: gris y deshabilitado sin cambios,
 * con el color de acción si hay cambios, y amarillo si otro usuario confirmó
 * cambios sobre algo del borrador (la confirmación va a ser rechazada).
 */
import Link from "next/link";
import type { RolProyecto } from "@prisma/client";
import { RolProyectoBadge } from "@/components/RolProyecto";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";

export type BuildResumen = {
  orden: number;
  estado: "EN_DESARROLLO" | "CERRADA";
  etiqueta: string;
  nombre: string | null;
  descripcion: string | null;
  cerradaEl: string | null;
  // H8: el entregable al que corresponde (solo las cerradas).
  entregable: string | null;
  // H15: el build en desarrollo tiene cambios confirmados (finalizar pide cerrarlo).
  tieneCambios: boolean;
};

export type EstadoConfirmar = "sin-cambios" | "con-cambios" | "conflicto";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" });

export function BarraProyecto({
  proyectoId,
  nombre,
  rol,
  builds,
  buildVisto,
  puedeEditar,
  finalizado,
  vistaActual,
  estadoConfirmar,
  confirmando,
  cambiosDeOtros,
  onNavegar,
  onAbrirCierre,
  onVerCambios,
  onAbrirElementos,
  onConfirmar,
  onDescartar,
}: {
  proyectoId: string;
  nombre: string;
  rol: RolProyecto;
  builds: BuildResumen[];
  buildVisto: BuildResumen;
  puedeEditar: boolean;
  // H15: el proyecto no tiene build en desarrollo.
  finalizado: boolean;
  // Se está mirando la versión actual (sin ?build): la en desarrollo o, si está finalizado, la última cerrada.
  vistaActual: boolean;
  estadoConfirmar: EstadoConfirmar;
  confirmando: boolean;
  cambiosDeOtros: number;
  // Antes de cambiar de versión: false si el usuario no quiere perder su borrador.
  onNavegar: () => boolean;
  onAbrirCierre: () => void;
  onVerCambios: () => void;
  // H11: abre la barra lateral en pantallas angostas.
  onAbrirElementos: () => void;
  onConfirmar: () => void;
  onDescartar: () => void;
}) {
  const cerrada = buildVisto.estado === "CERRADA";
  const href = (b: BuildResumen) => (b.estado === "EN_DESARROLLO" ? `/proyectos/${proyectoId}` : `/proyectos/${proyectoId}?build=${b.orden}`);

  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Link href="/proyectos" className="text-sm font-medium text-primary hover:underline" onClick={(e) => !onNavegar() && e.preventDefault()}>
            ← Proyectos
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl">{nombre}</h1>
            <RolProyectoBadge rol={rol} />
            {!puedeEditar && <Badge variant="neutral">Solo lectura</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Solo en pantallas angostas: ahí la barra lateral no está a la vista. */}
          <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={onAbrirElementos}>
            <span aria-hidden="true">☰</span> Elementos
          </Button>

          {cambiosDeOtros > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={onVerCambios}>
              Cambios de otros usuarios
            </Button>
          )}

          <details className="relative">
            <summary
              className={buttonStyles({ variant: "outline", size: "sm", className: "cursor-pointer list-none [&::-webkit-details-marker]:hidden" })}
              aria-label={`Versión que estás viendo: ${buildVisto.etiqueta}. Cambiar de versión`}
            >
              {cerrada ? `Versión ${buildVisto.etiqueta}` : "En desarrollo"} ▾
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-72 rounded-[var(--radius)] border bg-card p-2 shadow-lg">
              <ul className="flex max-h-72 flex-col gap-1 overflow-auto">
                {builds.map((b) => (
                  <li key={b.orden}>
                    <Link
                      href={href(b)}
                      aria-current={b.orden === buildVisto.orden ? "true" : undefined}
                      className="flex flex-col rounded-md px-2 py-1.5 text-sm hover:bg-muted aria-[current=true]:bg-secondary"
                      onClick={(e) => !onNavegar() && e.preventDefault()}
                    >
                      <span className="font-medium">{b.estado === "EN_DESARROLLO" ? "En desarrollo" : `Versión ${b.etiqueta}`}</span>
                      {b.estado === "CERRADA" && (
                        <span className="text-xs text-muted-foreground">
                          {[b.nombre, b.cerradaEl && `cerrada el ${formatoFecha.format(new Date(b.cerradaEl))}`].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {puedeEditar && !cerrada && (
                <Button type="button" size="sm" variant="secondary"                   className="mt-2 w-full"
                  onClick={(e) => {
                    // El menú se cierra para que no quede abierto detrás del diálogo.
                    e.currentTarget.closest("details")?.removeAttribute("open");
                    onAbrirCierre();
                  }}
                >
                  Cerrar la versión en desarrollo…
                </Button>
              )}
            </div>
          </details>

          {cerrada ? (
            // En un proyecto finalizado, la versión actual es la última cerrada (H15).
            !vistaActual && (
              <Link href={`/proyectos/${proyectoId}`} className={buttonStyles({ size: "sm" })}>
                Volver a la versión actual
              </Link>
            )
          ) : (
            puedeEditar && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={estadoConfirmar === "sin-cambios" || confirmando}
                  onClick={onDescartar}
                >
                  Descartar cambios
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={estadoConfirmar === "conflicto" ? "warning" : estadoConfirmar === "con-cambios" ? "primary" : "outline"}
                  disabled={estadoConfirmar === "sin-cambios" || confirmando}
                  aria-describedby={estadoConfirmar === "conflicto" ? "aviso-conflicto" : undefined}
                  onClick={onConfirmar}
                >
                  {confirmando ? "Confirmando…" : "Confirmar cambios"}
                </Button>
                {estadoConfirmar === "conflicto" && (
                  <span id="aviso-conflicto" className="sr-only">
                    Otro usuario confirmó cambios sobre elementos que estás modificando: la confirmación va a ser rechazada.
                  </span>
                )}
              </>
            )
          )}
        </div>
      </div>

      {cerrada && (
        <p className="mt-2 text-sm text-muted-foreground">
          {finalizado && <strong className="font-semibold text-foreground">El proyecto está finalizado. </strong>}
          Estás viendo la versión {buildVisto.etiqueta}
          {buildVisto.nombre ? ` (${buildVisto.nombre})` : ""}
          {buildVisto.cerradaEl ? `, cerrada el ${formatoFecha.format(new Date(buildVisto.cerradaEl))}` : ""}
          {buildVisto.entregable ? `, del entregable “${buildVisto.entregable}”` : ""}.
          {finalizado && vistaActual ? " La documentación está en solo lectura." : " Todo está en solo lectura."}
          {buildVisto.descripcion ? ` ${buildVisto.descripcion}` : ""}
        </p>
      )}
    </div>
  );
}
