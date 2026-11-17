/**
 * Lo que se ve al entrar a un proyecto, antes de elegir un elemento: su
 * definición (H13), sus entregables (H14) y los colaboradores aceptados (H2).
 * La definición, los entregables y los colaboradores los edita solo el dueño, y
 * nunca parado en una versión cerrada (toda esa pantalla es de solo lectura).
 */
import type { RolProyecto } from "@prisma/client";
import { DefinicionProyecto } from "@/components/proyecto/DefinicionProyecto";
import { EntregablesProyecto } from "@/components/proyecto/EntregablesProyecto";
import { RolProyectoBadge } from "@/components/RolProyecto";
import { Button } from "@/components/ui/button";
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
  onVerColaboradores,
  finalizado,
  onFinalizar,
  onReabrir,
}: {
  proyectoId: string;
  definicion: Definicion;
  ownerNombre: string;
  creadoEn: string;
  miembros: { id: string; nombre: string; email: string; rol: RolProyecto }[];
  entregables: EntregableVista[];
  hoy: string;
  // El dueño, fuera de una versión cerrada: definición, entregables y colaboradores.
  puedeEditarProyecto: boolean;
  // H2: abre la ventana de colaboradores (el dueño los administra desde ahí).
  onVerColaboradores: () => void;
  // H15
  finalizado: boolean;
  onFinalizar: () => void;
  onReabrir: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <DefinicionProyecto
        proyectoId={proyectoId}
        definicion={definicion}
        ownerNombre={ownerNombre}
        creadoEn={creadoEn}
        puedeEditar={puedeEditarProyecto}
        finalizado={finalizado}
        onFinalizar={onFinalizar}
        onReabrir={onReabrir}
      />

      <EntregablesProyecto proyectoId={proyectoId} entregables={entregables} hoy={hoy} puedeEditar={puedeEditarProyecto} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Colaboradores</CardTitle>
              <CardDescription>Solo se muestran membresías aceptadas.</CardDescription>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={onVerColaboradores}>
              {puedeEditarProyecto ? "Administrar colaboradores" : "Ver colaboradores"}
            </Button>
          </div>
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
