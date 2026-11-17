/**
 * H14 — Editar (incluido marcarlo como entregado) o eliminar un entregable.
 * Solo el dueño. No se elimina un entregable al que apunta algún build cerrado.
 */
import { NextResponse } from "next/server";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";
import { actualizarEntregable, eliminarEntregable } from "@/lib/db/entregables";
import { entregableSchema } from "@/lib/schemas/entregable";

type Contexto = { params: Promise<{ id: string; entregableId: string }> };

const entregableNoEncontrado = () => NextResponse.json({ error: "Entregable no encontrado" }, { status: 404 });

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const { id, entregableId } = await params;
    const acceso = await requerirAccesoAProyecto(id, ["OWNER"]);
    if (!acceso) return proyectoNoEncontrado();

    const body: unknown = await request.json().catch(() => null);
    const resultado = entregableSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json({ error: "Datos inválidos", detalles: resultado.error.flatten() }, { status: 400 });
    }

    const entregable = await actualizarEntregable(id, entregableId, resultado.data);
    if (!entregable) return entregableNoEncontrado();
    return NextResponse.json(entregable);
  } catch (error) {
    return responderError("PUT /api/proyectos/:id/entregables/:entregableId", error);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id, entregableId } = await params;
    const acceso = await requerirAccesoAProyecto(id, ["OWNER"]);
    if (!acceso) return proyectoNoEncontrado();

    const resultado = await eliminarEntregable(id, entregableId);
    if (resultado.ok) return new NextResponse(null, { status: 204 });
    if (resultado.motivo === "NO_ENCONTRADO") return entregableNoEncontrado();
    return NextResponse.json(
      {
        error: `No se puede eliminar: lo referencian las versiones ${resultado.versiones.join(", ")}`,
        codigo: "ENTREGABLE_CON_VERSIONES",
        versiones: resultado.versiones,
      },
      { status: 409 },
    );
  } catch (error) {
    return responderError("DELETE /api/proyectos/:id/entregables/:entregableId", error);
  }
}
