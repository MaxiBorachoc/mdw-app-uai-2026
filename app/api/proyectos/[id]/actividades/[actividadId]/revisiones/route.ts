/**
 * H6: el historial de una actividad (todas sus revisiones, con versión, build,
 * autor y fecha). Cualquier colaborador con invitación aceptada lo puede ver.
 */
import { NextResponse } from "next/server";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";
import { historialDeActividad } from "@/lib/db/documentacion";

type Contexto = { params: Promise<{ id: string; actividadId: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id, actividadId } = await params;
    const acceso = await requerirAccesoAProyecto(id);
    if (!acceso) return proyectoNoEncontrado();

    const revisiones = await historialDeActividad(id, actividadId);
    // Una actividad sin revisiones no es de este proyecto (o no existe): mismo 404.
    if (revisiones.length === 0) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
    }
    return NextResponse.json(revisiones);
  } catch (error) {
    return responderError("GET /api/proyectos/:id/actividades/:actividadId/revisiones", error);
  }
}
