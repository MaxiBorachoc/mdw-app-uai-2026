/**
 * Lo que se ve al entrar a un proyecto, antes de elegir un elemento: su
 * definición (H13), sus entregables (H14), cómo documentar y los colaboradores
 * aceptados. La definición y los entregables los edita solo el dueño, y nunca
 * parado en una versión cerrada (toda esa pantalla es de solo lectura).
 */
import type { RolProyecto } from "@prisma/client";
import { DefinicionProyecto } from "@/components/proyecto/DefinicionProyecto";
import { EntregablesProyecto } from "@/components/proyecto/EntregablesProyecto";
import { RolProyectoBadge } from "@/components/RolProyecto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EntregableVista } from "@/lib/schemas/entregable";
import type { DefinicionProyecto as Definicion } from "@/lib/schemas/proyecto";

export function PanelProyecto({
  proyectoId,
  definicion,
  ownerNombre,
  creadoEn,
  miembros,
  entregables,
  hoy,
  puedeEditarProyecto,
  puedeEditar,
}: {
  proyectoId: string;
  definicion: Definicion;
  ownerNombre: string;
  creadoEn: string;
  miembros: { id: string; nombre: string; email: string; rol: RolProyecto }[];
  entregables: EntregableVista[];
  hoy: string;
  // El dueño, fuera de una versión cerrada: definición y entregables.
  puedeEditarProyecto: boolean;
  // Dueño o editor, fuera de una versión cerrada: la documentación.
  puedeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <DefinicionProyecto
        proyectoId={proyectoId}
        definicion={definicion}
        ownerNombre={ownerNombre}
        creadoEn={creadoEn}
        puedeEditar={puedeEditarProyecto}
      />

      <EntregablesProyecto proyectoId={proyectoId} entregables={entregables} hoy={hoy} puedeEditar={puedeEditarProyecto} />

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
              <li>
                Cuando la documentación de un entregable está lista, cerrá la versión en desarrollo desde el selector de versión
                y elegí a qué entregable corresponde.
              </li>
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
