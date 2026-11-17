/**
 * H14 — Los entregables de un proyecto.
 *
 * GET: cualquier colaborador con invitación aceptada los ve (con los builds
 * cerrados que apuntan a cada uno). POST: solo el dueño los crea.
 */
import { NextResponse } from "next/server";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";
import { crearEntregable, listarEntregables } from "@/lib/db/entregables";
import { entregableSchema } from "@/lib/schemas/entregable";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const acceso = await requerirAccesoAProyecto(id);
    if (!acceso) return proyectoNoEncontrado();

    return NextResponse.json(await listarEntregables(id));
  } catch (error) {
    return responderError("GET /api/proyectos/:id/entregables", error);
  }
}

export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    // Sección 6: solo el dueño planifica los entregables.
    const acceso = await requerirAccesoAProyecto(id, ["OWNER"]);
    if (!acceso) return proyectoNoEncontrado();

    const body: unknown = await request.json().catch(() => null);
    const resultado = entregableSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json({ error: "Datos inválidos", detalles: resultado.error.flatten() }, { status: 400 });
    }

    return NextResponse.json(await crearEntregable(id, resultado.data), { status: 201 });
  } catch (error) {
    return responderError("POST /api/proyectos/:id/entregables", error);
  }
}
