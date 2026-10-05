/**
 * H1 — Crear un proyecto / listar los proyectos del usuario.
 *
 * Orden de las preguntas del handler: sesion (401), body (400), regla (409),
 * consulta. Estos dos endpoints son para cualquier usuario con sesion: no hay
 * un proyecto sobre el cual chequear rol.
 */
import { NextResponse } from "next/server";
import { requerirUsuario } from "@/lib/auth";
import { crearProyectoSchema } from "@/lib/schemas/proyecto";
import { crearProyecto, listarProyectosDe } from "@/lib/db/proyectos";
import { responderError } from "@/lib/api/errores";

export async function GET() {
  try {
    const usuario = await requerirUsuario();
    return NextResponse.json(await listarProyectosDe(usuario.id));
  } catch (error) {
    return responderError("GET /api/proyectos", error);
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await requerirUsuario();

    const body: unknown = await request.json().catch(() => null);
    const resultado = crearProyectoSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten() },
        { status: 400 },
      );
    }

    const proyecto = await crearProyecto(resultado.data, usuario.id);
    return NextResponse.json(proyecto, { status: 201 });
  } catch (error) {
    return responderError("POST /api/proyectos", error);
  }
}
