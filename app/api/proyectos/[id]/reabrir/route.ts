/**
 * H15 — Reabrir un proyecto finalizado. Solo el dueño. Abre un build en
 * desarrollo nuevo; la numeración sigue desde la última versión cerrada.
 */
import { NextResponse } from "next/server";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";
import { reabrirProyecto } from "@/lib/db/versiones";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const acceso = await requerirAccesoAProyecto(id, ["OWNER"]);
    if (!acceso) return proyectoNoEncontrado();

    const reapertura = await reabrirProyecto(id);
    if (!reapertura.ok) {
      return NextResponse.json({ error: "El proyecto no está finalizado", codigo: "PROYECTO_EN_PROCESO" }, { status: 409 });
    }
    return NextResponse.json({ estado: "EN_PROCESO", siguiente: reapertura.siguiente });
  } catch (error) {
    return responderError("POST /api/proyectos/:id/reabrir", error);
  }
}
