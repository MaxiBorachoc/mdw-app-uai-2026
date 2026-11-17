"use client";

/**
 * H5 / H6 / H7: los datos de una actividad (o de un diagrama, que es una
 * actividad sin padre): nombre, documentación, historias asociadas y actividad
 * padre. Cada cambio va al borrador. Los mensajes de error salen del mismo schema
 * que valida el servidor (lib/schemas/actividad.ts).
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Actividad } from "@/lib/documentacion";
import { contenidoActividadSchema } from "@/lib/schemas/actividad";

const SIN_PADRE = "__sin-padre__";

export function FormularioActividad({
  prefijo,
  actividad,
  soloLectura,
  mostrarErrores,
  historias,
  padresPosibles,
  onCambiar,
  onCambiarPadre,
  onEliminar,
}: {
  prefijo: string;
  actividad: Actividad;
  soloLectura: boolean;
  mostrarErrores: boolean;
  historias: { id: string; titulo: string }[];
  padresPosibles: { id: string; nombre: string; ruta: string }[];
  onCambiar: (cambio: Partial<Pick<Actividad, "nombre" | "documentacion" | "historiaIds">>) => void;
  onCambiarPadre: (padreId: string | null) => void;
  onEliminar: () => void;
}) {
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const validacion = contenidoActividadSchema.safeParse({ nombre: actividad.nombre, documentacion: actividad.documentacion });
  const errores = validacion.success ? {} : validacion.error.flatten().fieldErrors;
  const errorDe = (campo: "nombre" | "documentacion") =>
    mostrarErrores || tocados.has(campo) ? errores[campo]?.[0] : undefined;
  const errorNombre = errorDe("nombre");
  const errorDocumentacion = errorDe("documentacion");
  const id = (campo: string) => `${prefijo}-${campo}`;
  const esDiagrama = actividad.padreId === null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={id("nombre")} className="mb-2 block text-sm font-medium">
          Nombre {esDiagrama ? "del diagrama" : "de la actividad"}
        </label>
        <Input
          id={id("nombre")}
          value={actividad.nombre}
          readOnly={soloLectura}
          aria-invalid={errorNombre ? true : undefined}
          aria-describedby={errorNombre ? id("nombre-error") : undefined}
          onChange={(e) => onCambiar({ nombre: e.target.value })}
          onBlur={() => setTocados((t) => new Set(t).add("nombre"))}
        />
        {errorNombre && (
          <p id={id("nombre-error")} className="mt-1 text-sm text-destructive">
            {errorNombre}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={id("documentacion")} className="mb-2 block text-sm font-medium">
          Documentación
        </label>
        <Textarea
          id={id("documentacion")}
          rows={5}
          value={actividad.documentacion}
          readOnly={soloLectura}
          placeholder="Qué ocurre en este paso, quién lo hace, qué reglas aplica."
          aria-invalid={errorDocumentacion ? true : undefined}
          aria-describedby={errorDocumentacion ? id("documentacion-error") : undefined}
          onChange={(e) => onCambiar({ documentacion: e.target.value })}
          onBlur={() => setTocados((t) => new Set(t).add("documentacion"))}
        />
        {errorDocumentacion && (
          <p id={id("documentacion-error")} className="mt-1 text-sm text-destructive">
            {errorDocumentacion}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Historias de usuario asociadas</legend>
        {historias.length === 0 ? (
          <p className="text-sm text-muted-foreground">El proyecto todavía no tiene historias de usuario.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {historias.map((h) => {
              const marcada = actividad.historiaIds.includes(h.id);
              return (
                <li key={h.id} className="flex items-start gap-2">
                  <input
                    id={id(`historia-${h.id}`)}
                    type="checkbox"
                    className="mt-1 size-4 accent-[var(--primary)]"
                    checked={marcada}
                    disabled={soloLectura}
                    onChange={() =>
                      onCambiar({
                        historiaIds: marcada
                          ? actividad.historiaIds.filter((x) => x !== h.id)
                          : [...actividad.historiaIds, h.id],
                      })
                    }
                  />
                  <label htmlFor={id(`historia-${h.id}`)} className="text-sm">
                    {h.titulo}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      {!soloLectura && (
        <div>
          <label htmlFor={id("padre")} className="mb-2 block text-sm font-medium">
            Ubicación
          </label>
          <select
            id={id("padre")}
            className="h-10 w-full rounded-[var(--radius)] border border-input bg-card px-3 text-sm"
            value={actividad.padreId ?? SIN_PADRE}
            onChange={(e) => onCambiarPadre(e.target.value === SIN_PADRE ? null : e.target.value)}
          >
            <option value={SIN_PADRE}>Ninguna: es un diagrama</option>
            {padresPosibles.map((p) => (
              <option key={p.id} value={p.id}>
                Dentro de {p.ruta}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            No se puede mover adentro de sí misma ni de una de sus actividades internas. Al moverla se quitan sus flechas.
          </p>
        </div>
      )}

      {!soloLectura && (
        <Button type="button" variant="danger" size="sm" className="self-start" onClick={onEliminar}>
          Eliminar {esDiagrama ? "diagrama" : "actividad"}
        </Button>
      )}
    </div>
  );
}
