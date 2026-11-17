/**
 * H15 — Finalizar el proyecto. Solo el dueño.
 *
 * Si el build en desarrollo tiene cambios, hace falta el cierre (número y
 * entregable, mismas reglas que H8); si está vacío, se descarta. El proyecto
 * queda FINALIZADO, sin build en desarrollo.
 */
import { NextResponse } from "next/server";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { respuestaFallaCierre } from "@/lib/api/cierre";
import { responderError } from "@/lib/api/errores";
import { finalizarProyecto } from "@/lib/db/versiones";
import { finalizarProyectoSchema } from "@/lib/schemas/versionProyecto";

type Contexto = { params: Promise<{ id: string }> };

const mensajes = {
  YA_FINALIZADO: "El proyecto ya está finalizado",
  CIERRE_REQUERIDO:
    "La versión en desarrollo tiene cambios: para finalizar hay que cerrarla con su número y su entregable",
  NADA_QUE_FINALIZAR: "No hay nada que finalizar: el proyecto no tiene versiones cerradas ni cambios en desarrollo",
} as const;

export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    // Sección 6: solo el dueño finaliza y reabre el proyecto.
    const acceso = await requerirAccesoAProyecto(id, ["OWNER"]);
    if (!acceso) return proyectoNoEncontrado();

    const body: unknown = await request.json().catch(() => ({}));
    const resultado = finalizarProyectoSchema.safeParse(body ?? {});
    if (!resultado.success) {
      return NextResponse.json({ error: "Datos inválidos", detalles: resultado.error.flatten() }, { status: 400 });
    }

    const finalizacion = await finalizarProyecto(id, resultado.data);
    if (!finalizacion.ok) {
      if ("motivo" in finalizacion) {
        return NextResponse.json({ error: mensajes[finalizacion.motivo], codigo: finalizacion.motivo }, { status: 409 });
      }
      // Solo hay fallas de cierre si vino el cierre.
      return respuestaFallaCierre(finalizacion, resultado.data.cierre ?? { numeroVersion: 0, numeroBuild: 0, numeroPatch: 0 });
    }
    return NextResponse.json({ estado: "FINALIZADO", cerrada: finalizacion.cerrada });
  } catch (error) {
    return responderError("POST /api/proyectos/:id/finalizar", error);
  }
}
