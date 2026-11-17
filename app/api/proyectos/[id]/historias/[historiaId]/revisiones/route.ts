/**
 * H4: el historial de una historia de usuario (todas sus revisiones, con versión,
 * build, autor y fecha). Cualquier colaborador con invitación aceptada lo puede ver.
 */
import { NextResponse } from "next/server";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";
import { historialDeHistoria } from "@/lib/db/documentacion";

type Contexto = { params: Promise<{ id: string; historiaId: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id, historiaId } = await params;
    const acceso = await requerirAccesoAProyecto(id);
    if (!acceso) return proyectoNoEncontrado();

    const revisiones = await historialDeHistoria(id, historiaId);
    // Una historia sin revisiones no es de este proyecto (o no existe): mismo 404.
    if (revisiones.length === 0) {
      return NextResponse.json({ error: "Historia no encontrada" }, { status: 404 });
    }
    return NextResponse.json(revisiones);
  } catch (error) {
    return responderError("GET /api/proyectos/:id/historias/:historiaId/revisiones", error);
  }
}
