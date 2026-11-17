"use client";

/**
 * H14: los entregables del proyecto, ordenados por fecha estimada, con su estado
 * calculado y las versiones cerradas que apuntan a cada uno. Todos los ven; solo
 * el dueño los crea, edita, marca como entregados y elimina.
 *
 * "hoy" llega del servidor (la fecha de Argentina al armar la página) para que el
 * estado calculado sea el mismo en el servidor y en el navegador.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormularioEntregable } from "@/components/proyecto/FormularioEntregable";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { estadoEntregable, etiquetaEstadoEntregable, type EstadoEntregable } from "@/lib/entregables";
import type { EntregableInput, EntregableVista } from "@/lib/schemas/entregable";
import { formatearFecha } from "@/lib/utils";

const varianteEstado: Record<EstadoEntregable, "neutral" | "danger" | "success" | "warning"> = {
  PENDIENTE: "neutral",
  ATRASADO: "danger",
  ENTREGADO_A_TIEMPO: "success",
  ENTREGADO_CON_ATRASO: "warning",
};

export function EntregablesProyecto({
  proyectoId,
  entregables,
  hoy,
  puedeEditar,
}: {
  proyectoId: string;
  entregables: EntregableVista[];
  hoy: string;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  // "nuevo", el id del entregable que se está editando, o null.
  const [editando, setEditando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (url: string, metodo: "POST" | "PUT", datos: EntregableInput) => {
    try {
      const respuesta = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        return cuerpo?.error ?? "No se pudo guardar. Probá de nuevo en unos segundos.";
      }
      setEditando(null);
      router.refresh();
      return null;
    } catch {
      return "Revisá tu conexión y probá de nuevo.";
    }
  };

  const eliminar = async (entregable: EntregableVista) => {
    if (!window.confirm(`¿Eliminar el entregable “${entregable.nombre}”?`)) return;
    setError(null);
    try {
      const respuesta = await fetch(`/api/proyectos/${proyectoId}/entregables/${entregable.id}`, { method: "DELETE" });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        setError(cuerpo?.error ?? "No se pudo eliminar. Probá de nuevo en unos segundos.");
        return;
      }
      router.refresh();
    } catch {
      setError("Revisá tu conexión y probá de nuevo.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Entregables</CardTitle>
          <CardDescription>Lo que el proyecto se comprometió a entregar y si se cumplieron las fechas.</CardDescription>
        </div>
        {puedeEditar && editando !== "nuevo" && (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditando("nuevo")}>
            Nuevo entregable
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {editando === "nuevo" && (
          <FormularioEntregable
            idBase="entregable-nuevo"
            textoGuardar="Crear entregable"
            onGuardar={(datos) => guardar(`/api/proyectos/${proyectoId}/entregables`, "POST", datos)}
            onCancelar={() => setEditando(null)}
          />
        )}
        {error && (
          <Alert variant="error">
            <p>{error}</p>
          </Alert>
        )}
        {entregables.length === 0 && editando !== "nuevo" && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay entregables.{" "}
            {puedeEditar
              ? "Creá uno para poder cerrar versiones: cada versión cerrada corresponde a un entregable."
              : "El dueño tiene que crear uno antes de que se pueda cerrar una versión."}
          </p>
        )}
        <ul className="flex flex-col divide-y">
          {entregables.map((e) => {
            const estado = estadoEntregable(e, hoy);
            return (
              <li key={e.id} className="py-3 first:pt-0 last:pb-0">
                {editando === e.id ? (
                  <FormularioEntregable
                    idBase={`entregable-${e.id}`}
                    inicial={e}
                    textoGuardar="Guardar entregable"
                    onGuardar={(datos) => guardar(`/api/proyectos/${proyectoId}/entregables/${e.id}`, "PUT", datos)}
                    onCancelar={() => setEditando(null)}
                  />
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-words font-medium">{e.nombre}</p>
                        <Badge variant={varianteEstado[estado]}>{etiquetaEstadoEntregable[estado]}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Fecha estimada: {formatearFecha(e.fechaEstimada)}
                        {e.entregado && e.fechaEntrega ? ` · Entregado el ${formatearFecha(e.fechaEntrega)}` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {e.versiones.length > 0
                          ? `Versiones: ${e.versiones.map((v) => v.etiqueta).join(", ")}`
                          : "Todavía no tiene versiones cerradas."}
                      </p>
                      {e.descripcion && <p className="mt-1 whitespace-pre-line text-sm">{e.descripcion}</p>}
                    </div>
                    {puedeEditar && editando === null && (
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(e.id)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Eliminar el entregable ${e.nombre}`}
                          onClick={() => eliminar(e)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
