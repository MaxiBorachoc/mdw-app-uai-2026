"use client";

/**
 * H3 / H4: el detalle de una historia de usuario. Cada cambio va al borrador;
 * recién "Confirmar cambios" crea la revisión. Los mensajes de error salen del
 * mismo schema que valida el servidor (lib/schemas/historiaUsuario.ts).
 */
import { useState } from "react";
import { HistorialRevisiones } from "@/components/proyecto/HistorialRevisiones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Historia, HistoriaContenido } from "@/lib/documentacion";
import { contenidoHistoriaSchema, CRITERIOS_MAX } from "@/lib/schemas/historiaUsuario";

type Campo = "titulo" | "descripcion" | "criteriosAceptacion";

export function PanelHistoria({
  proyectoId,
  historia,
  nueva,
  soloLectura,
  mostrarErrores,
  actividadesAsociadas,
  nombreDe,
  onCambiar,
  onEliminar,
  onIrAActividad,
}: {
  proyectoId: string;
  historia: Historia;
  nueva: boolean;
  soloLectura: boolean;
  mostrarErrores: boolean;
  actividadesAsociadas: { id: string; nombre: string; ruta: string }[];
  nombreDe: (id: string) => string;
  onCambiar: (contenido: HistoriaContenido) => void;
  onEliminar: () => void;
  onIrAActividad: (id: string) => void;
}) {
  const [tocados, setTocados] = useState<Set<Campo>>(new Set());
  const tocar = (campo: Campo) => setTocados((t) => new Set(t).add(campo));

  const contenido: HistoriaContenido = {
    titulo: historia.titulo,
    descripcion: historia.descripcion,
    criteriosAceptacion: historia.criteriosAceptacion,
  };
  const validacion = contenidoHistoriaSchema.safeParse(contenido);
  const errores = validacion.success ? {} : validacion.error.flatten().fieldErrors;
  const errorDe = (campo: Campo) => (mostrarErrores || tocados.has(campo) ? errores[campo]?.[0] : undefined);

  const cambiar = (parcial: Partial<HistoriaContenido>) => onCambiar({ ...contenido, ...parcial });
  const cambiarCriterio = (i: number, valor: string) =>
    cambiar({ criteriosAceptacion: contenido.criteriosAceptacion.map((c, j) => (j === i ? valor : c)) });

  const errorTitulo = errorDe("titulo");
  const errorDescripcion = errorDe("descripcion");
  const errorCriterios = errorDe("criteriosAceptacion");

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Historia de usuario</p>
              <CardTitle className="break-words text-2xl">{historia.titulo || "Historia sin título"}</CardTitle>
            </div>
          </div>
          {!soloLectura && (
            <CardDescription>Los cambios se guardan como una versión nueva al tocar “Confirmar cambios”.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <label htmlFor="historia-titulo" className="mb-2 block text-sm font-medium">
              Título
            </label>
            <Input
              id="historia-titulo"
              value={contenido.titulo}
              readOnly={soloLectura}
              aria-invalid={errorTitulo ? true : undefined}
              aria-describedby={errorTitulo ? "historia-titulo-error" : undefined}
              onChange={(e) => cambiar({ titulo: e.target.value })}
              onBlur={() => tocar("titulo")}
            />
            {errorTitulo && (
              <p id="historia-titulo-error" className="mt-1 text-sm text-destructive">
                {errorTitulo}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="historia-descripcion" className="mb-2 block text-sm font-medium">
              Descripción
            </label>
            <Textarea
              id="historia-descripcion"
              rows={4}
              value={contenido.descripcion}
              readOnly={soloLectura}
              placeholder="Como <rol>, quiero <acción>, para <beneficio>."
              aria-invalid={errorDescripcion ? true : undefined}
              aria-describedby={errorDescripcion ? "historia-descripcion-error" : undefined}
              onChange={(e) => cambiar({ descripcion: e.target.value })}
              onBlur={() => tocar("descripcion")}
            />
            {errorDescripcion && (
              <p id="historia-descripcion-error" className="mt-1 text-sm text-destructive">
                {errorDescripcion}
              </p>
            )}
          </div>

          <fieldset aria-describedby={errorCriterios ? "historia-criterios-error" : undefined}>
            <legend className="mb-2 text-sm font-medium">Criterios de aceptación</legend>
            <ol className="flex flex-col gap-2">
              {contenido.criteriosAceptacion.map((criterio, i) => (
                <li key={i} className="flex items-start gap-2">
                  <label htmlFor={`criterio-${i}`} className="sr-only">
                    Criterio {i + 1}
                  </label>
                  <Input
                    id={`criterio-${i}`}
                    value={criterio}
                    readOnly={soloLectura}
                    onChange={(e) => cambiarCriterio(i, e.target.value)}
                    onBlur={() => tocar("criteriosAceptacion")}
                  />
                  {!soloLectura && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Quitar el criterio ${i + 1}`}
                      onClick={() =>
                        cambiar({ criteriosAceptacion: contenido.criteriosAceptacion.filter((_, j) => j !== i) })
                      }
                    >
                      Quitar
                    </Button>
                  )}
                </li>
              ))}
            </ol>
            {errorCriterios && (
              <p id="historia-criterios-error" className="mt-1 text-sm text-destructive">
                {errorCriterios}
              </p>
            )}
            {!soloLectura && contenido.criteriosAceptacion.length < CRITERIOS_MAX && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => cambiar({ criteriosAceptacion: [...contenido.criteriosAceptacion, ""] })}
              >
                Agregar criterio
              </Button>
            )}
          </fieldset>

          {!soloLectura && (
            <Button type="button" variant="danger" size="sm" className="self-start" onClick={onEliminar}>
              Eliminar historia
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actividades asociadas</CardTitle>
          <CardDescription>Las actividades que implementan esta historia. La asociación se define desde cada actividad.</CardDescription>
        </CardHeader>
        <CardContent>
          {actividadesAsociadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguna actividad está asociada a esta historia.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {actividadesAsociadas.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-primary hover:underline"
                    onClick={() => onIrAActividad(a.id)}
                  >
                    {a.nombre}
                  </button>
                  <span className="ml-2 text-xs text-muted-foreground">{a.ruta}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!nueva && <HistorialRevisiones proyectoId={proyectoId} tipo="historia" elementoId={historia.id} nombreDe={nombreDe} />}
    </div>
  );
}
