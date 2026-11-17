/**
 * Lo que se ve al entrar a un proyecto, antes de elegir un elemento: sus datos,
 * los colaboradores aceptados y un resumen de la documentación del build visto.
 */
import type { RolProyecto } from "@prisma/client";
import { RolProyectoBadge } from "@/components/RolProyecto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cantidad } from "@/lib/utils";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" });

export function PanelProyecto({
  descripcion,
  ownerNombre,
  creadoEn,
  versionVista,
  miembros,
  totales,
  puedeEditar,
}: {
  descripcion: string;
  ownerNombre: string;
  creadoEn: string;
  versionVista: string;
  miembros: { id: string; nombre: string; email: string; rol: RolProyecto }[];
  totales: { historias: number; diagramas: number; actividades: number; flechas: number };
  puedeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Información del proyecto</CardTitle>
          <CardDescription>{descripcion || "Este proyecto todavía no tiene una descripción."}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-muted-foreground">Propietario</dt>
              <dd className="mt-1 font-medium">{ownerNombre}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Creado</dt>
              <dd className="mt-1 font-medium">{formatoFecha.format(new Date(creadoEn))}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Versión que estás viendo</dt>
              <dd className="mt-1 font-medium">{versionVista}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Documentación</dt>
              <dd className="mt-1 font-medium">
                {[
                  cantidad(totales.historias, "historia", "historias"),
                  cantidad(totales.diagramas, "diagrama", "diagramas"),
                  cantidad(totales.actividades, "actividad", "actividades"),
                  cantidad(totales.flechas, "flecha", "flechas"),
                ].join(" · ")}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {puedeEditar && (
        <Card>
          <CardHeader>
            <CardTitle>Cómo documentar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>Cargá historias de usuario con “Nueva historia”, en la barra de la izquierda.</li>
              <li>Creá un diagrama con “Nuevo diagrama” y agregale actividades conectadas con flechas.</li>
              <li>Asociá cada actividad a las historias que implementa.</li>
              <li>Tocá “Confirmar cambios” para guardar: cada elemento modificado suma una versión.</li>
              <li>Antes de una entrega, cerrá la versión en desarrollo desde el selector de versión.</li>
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Colaboradores</CardTitle>
          <CardDescription>Solo se muestran membresías aceptadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {miembros.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <RolProyectoBadge rol={m.rol} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
