/** H1 — Consultar, editar y eliminar un proyecto puntual. */
import { NextResponse } from "next/server";
import { crearProyectoSchema } from "@/lib/schemas/proyecto";
import { actualizarProyecto, eliminarProyecto, obtenerProyecto } from "@/lib/db/proyectos";

type Contexto = { params: Promise<{ id: string }> };

function noEncontrado() {
  return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
}

export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params;
  // TODO (paso 8): exigir sesión y verificar que el usuario sea miembro.
  const proyecto = await obtenerProyecto(id);
  return proyecto ? NextResponse.json(proyecto) : noEncontrado();
}

export async function PUT(request: Request, { params }: Contexto) {
  const { id } = await params;
  // TODO (paso 8): exigir sesión y rol OWNER.
  const body: unknown = await request.json().catch(() => null);
  const resultado = crearProyectoSchema.safeParse(body);
  if (!resultado.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: resultado.error.flatten() },
      { status: 400 },
    );
  }

  const proyecto = await actualizarProyecto(id, resultado.data);
  return proyecto ? NextResponse.json(proyecto) : noEncontrado();
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params;
  // TODO (paso 8): exigir sesión y rol OWNER.
  const eliminado = await eliminarProyecto(id);
  return eliminado ? new NextResponse(null, { status: 204 }) : noEncontrado();
}
