"use client";

/**
 * H4 / H6: el historial de un elemento. Se pide a la API recién cuando el
 * usuario lo abre; cada revisión se ve en modo lectura, sin tocar la vigente.
 */
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type RevisionBase = {
  numeroVersion: number;
  eliminado: boolean;
  creadoEn: string;
  autor: { id: string; nombre: string };
  build: string;
};
type RevisionHistoria = RevisionBase & { titulo: string; descripcion: string; criteriosAceptacion: string[] };
type RevisionActividad = RevisionBase & {
  nombre: string;
  documentacion: string;
  actividadPadreId: string | null;
  posicionX: number | null;
  posicionY: number | null;
  historiaIds: string[];
};

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function HistorialRevisiones({
  proyectoId,
  tipo,
  elementoId,
  nombreDe,
}: {
  proyectoId: string;
  tipo: "historia" | "actividad";
  elementoId: string;
  // Para mostrar nombres en vez de ids (padre, historias asociadas).
  nombreDe: (id: string) => string;
}) {
  const [estado, setEstado] = useState<"cerrado" | "cargando" | "error" | "listo">("cerrado");
  const [revisiones, setRevisiones] = useState<(RevisionHistoria | RevisionActividad)[]>([]);

  const cargar = async () => {
    setEstado("cargando");
    try {
      const ruta = tipo === "historia" ? "historias" : "actividades";
      const respuesta = await fetch(`/api/proyectos/${proyectoId}/${ruta}/${elementoId}/revisiones`);
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      setRevisiones(await respuesta.json());
      setEstado("listo");
    } catch {
      setEstado("error");
    }
  };

  if (estado === "cerrado") {
    return (
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={cargar}>
        Ver historial de versiones
      </Button>
    );
  }

  return (
    <section aria-labelledby={`historial-${elementoId}`} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id={`historial-${elementoId}`} className="text-sm font-semibold">
          Historial de versiones
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEstado("cerrado")}>
          Ocultar
        </Button>
      </div>

      {estado === "cargando" && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}
      {estado === "error" && (
        <Alert variant="error">
          <p>No pudimos cargar el historial.</p>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={cargar}>
            Reintentar
          </Button>
        </Alert>
      )}
      {estado === "listo" && (
        <ol className="flex flex-col gap-2">
          {revisiones.map((r) => (
            <li key={r.numeroVersion}>
              <details className="rounded-[var(--radius)] border bg-card p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">Versión {r.numeroVersion}</span>
                  <Badge variant="neutral">Build {r.build}</Badge>
                  {r.eliminado && <Badge variant="danger">Eliminada</Badge>}
                  <span className="text-muted-foreground">
                    {formatoFecha.format(new Date(r.creadoEn))} · {r.autor.nombre}
                  </span>
                </summary>
                <dl className="mt-3 grid gap-2 text-sm">
                  {"titulo" in r ? (
                    <>
                      <div>
                        <dt className="font-medium text-muted-foreground">Título</dt>
                        <dd>{r.titulo}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Descripción</dt>
                        <dd className="whitespace-pre-wrap">{r.descripcion}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Criterios de aceptación</dt>
                        <dd>
                          <ul className="list-disc pl-5">
                            {r.criteriosAceptacion.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <dt className="font-medium text-muted-foreground">Nombre</dt>
                        <dd>{r.nombre}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Documentación</dt>
                        <dd className="whitespace-pre-wrap">{r.documentacion || "Sin documentación."}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Ubicación</dt>
                        <dd>
                          {r.actividadPadreId
                            ? `Dentro de ${nombreDe(r.actividadPadreId)}, en (${r.posicionX}, ${r.posicionY})`
                            : "Diagrama (sin actividad padre)"}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-muted-foreground">Historias asociadas</dt>
                        <dd>{r.historiaIds.length ? r.historiaIds.map(nombreDe).join(", ") : "Ninguna"}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
