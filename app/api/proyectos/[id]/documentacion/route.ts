/**
 * H9 / H11: la documentación de un build (historias, actividades y flechas
 * vigentes), tal como estaba en ese build. Sin ?build= devuelve el build en
 * desarrollo. Cualquier colaborador con invitación aceptada la puede leer.
 */
import { NextResponse } from "next/server";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";
import { cargarEstado, listarBuilds } from "@/lib/db/documentacion";
import { vigentes } from "@/lib/documentacion";
import { ordenBuildSchema } from "@/lib/schemas/cambios";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const acceso = await requerirAccesoAProyecto(id);
    if (!acceso) return proyectoNoEncontrado();

    const parametro = new URL(request.url).searchParams.get("build");
    const builds = await listarBuilds(id);
    let build = builds.find((b) => b.estado === "EN_DESARROLLO") ?? builds[0];
    if (parametro !== null) {
      const orden = ordenBuildSchema.safeParse(parametro);
      if (!orden.success) {
        return NextResponse.json({ error: "Datos inválidos", detalles: orden.error.flatten() }, { status: 400 });
      }
      build = builds.find((b) => b.orden === orden.data);
      if (!build) return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });
    }
    if (!build) return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });

    const estado = await cargarEstado(id, build.estado === "CERRADA" ? build.orden : null);
    return NextResponse.json({ build, ...vigentes(estado) });
  } catch (error) {
    return responderError("GET /api/proyectos/:id/documentacion", error);
  }
}
