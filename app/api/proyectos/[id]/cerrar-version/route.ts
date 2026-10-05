/** H8 — Cierra la versión en desarrollo de un proyecto y abre la siguiente. */
import { NextResponse } from "next/server";
import { USUARIO_DE_EJEMPLO_ID } from "@/lib/auth";
import { cerrarVersionProyectoSchema } from "@/lib/schemas/versionProyecto";
import { obtenerProyecto } from "@/lib/db/proyectos";
import { cerrarVersionEnDesarrollo } from "@/lib/db/versiones";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Contexto) {
  const { id } = await params;
  // TODO (paso 8): exigir sesión y roles OWNER o EDITOR.
  const body: unknown = await request.json().catch(() => null);
  const resultado = cerrarVersionProyectoSchema.safeParse(body);
  if (!resultado.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: resultado.error.flatten() },
      { status: 400 },
    );
  }

  if (!(await obtenerProyecto(id))) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  // TODO (paso 7): responder 409 para versiones repetidas o no ascendentes.
  const cierre = await cerrarVersionEnDesarrollo(id, resultado.data, USUARIO_DE_EJEMPLO_ID);
  return NextResponse.json(cierre);
}
