/** H1 — Crear un proyecto y listar los proyectos del usuario actual. */
import { NextResponse } from "next/server";
import { USUARIO_DE_EJEMPLO_ID } from "@/lib/auth";
import { crearProyectoSchema } from "@/lib/schemas/proyecto";
import { crearProyecto, listarProyectosDe } from "@/lib/db/proyectos";

export async function GET() {
  // TODO (paso 8): obtener el usuario desde la sesión y devolver 401 si no existe.
  return NextResponse.json(await listarProyectosDe(USUARIO_DE_EJEMPLO_ID));
}

export async function POST(request: Request) {
  // TODO (paso 8): obtener el usuario desde la sesión y devolver 401 si no existe.
  const body: unknown = await request.json().catch(() => null);
  const resultado = crearProyectoSchema.safeParse(body);
  if (!resultado.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: resultado.error.flatten() },
      { status: 400 },
    );
  }

  const proyecto = await crearProyecto(resultado.data, USUARIO_DE_EJEMPLO_ID);
  return NextResponse.json(proyecto, { status: 201 });
}
