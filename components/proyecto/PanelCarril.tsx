"use client";

/**
 * H17: el carril elegido en el lienzo. Se edita solo el nombre: la posición y el
 * ancho se cambian arrastrando el carril en el diagrama (no hay un campo para
 * escribirlos). Muestra también la opción de eliminarlo y su historial.
 */
import { useState } from "react";
import { HistorialRevisiones } from "@/components/proyecto/HistorialRevisiones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Carril } from "@/lib/documentacion";
import { carrilEnBorradorSchema } from "@/lib/schemas/carril";

export function PanelCarril({
  proyectoId,
  carril,
  nuevo,
  soloLectura,
  mostrarErrores,
  nombreDe,
  onCambiarNombre,
  onEliminar,
  onCerrar,
}: {
  proyectoId: string;
  carril: Carril;
  nuevo: boolean;
  soloLectura: boolean;
  mostrarErrores: boolean;
  nombreDe: (id: string) => string;
  onCambiarNombre: (nombre: string) => void;
  onEliminar: () => void;
  onCerrar: () => void;
}) {
  const [tocado, setTocado] = useState(false);
  // El mismo schema que valida el servidor. Que el nombre no se repita en el
  // diagrama lo controla el servidor al confirmar.
  const validacion = carrilEnBorradorSchema.shape.nombre.safeParse(carril.nombre);
  const error = (mostrarErrores || tocado) && !validacion.success ? validacion.error.issues[0]?.message : undefined;
  const idCampo = `carril-${carril.id}-nombre`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">Carril elegido en el diagrama</p>
            <CardTitle className="break-words">{carril.nombre || "Sin nombre"}</CardTitle>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <label htmlFor={idCampo} className="mb-2 block text-sm font-medium">
            Nombre del carril
          </label>
          <Input
            id={idCampo}
            value={carril.nombre}
            readOnly={soloLectura}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${idCampo}-error` : undefined}
            onChange={(e) => onCambiarNombre(e.target.value)}
            onBlur={() => setTocado(true)}
          />
          {error && (
            <p id={`${idCampo}-error`} className="mt-1 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        {!soloLectura && (
          <Button type="button" size="sm" variant="danger" className="self-start" onClick={onEliminar}>
            Eliminar carril
          </Button>
        )}
        {!nuevo && (
          <HistorialRevisiones key={carril.id} proyectoId={proyectoId} tipo="carril" elementoId={carril.id} nombreDe={nombreDe} />
        )}
      </CardContent>
    </Card>
  );
}
