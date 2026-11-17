/**
 * H12 — Confirmar los cambios de un borrador, y consultar los cambios que
 * confirmaron otros usuarios.
 *
 * POST: Zod valida la forma (400), lib/documentacion.ts decide si el resultado
 * respeta las reglas y si hay conflicto con lo que confirmó otro usuario (409),
 * y lib/db/documentacion.ts escribe una revisión por elemento modificado, en una
 * sola transacción que bloquea el build en desarrollo.
 *
 * GET ?desde=<fecha>: lo que otros confirmaron después de esa fecha. Lo consulta
 * la pantalla del proyecto periódicamente para actualizarse o avisar.
 */
import { NextResponse } from "next/server";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";
import { ahoraEnLaBase, cambiosDeOtrosDesde, confirmarCambios } from "@/lib/db/documentacion";
import { cambiosSchema, consultaCambiosSchema } from "@/lib/schemas/cambios";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    // Sección 6: solo dueño y editor crean, modifican o eliminan documentación.
    const acceso = await requerirAccesoAProyecto(id, ["OWNER", "EDITOR"]);
    if (!acceso) return proyectoNoEncontrado();

    const body: unknown = await request.json().catch(() => null);
    const resultado = cambiosSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json({ error: "Datos inválidos", detalles: resultado.error.flatten() }, { status: 400 });
    }

    const confirmacion = await confirmarCambios(id, acceso.usuario.id, resultado.data);
    if (!confirmacion.ok) {
      if (confirmacion.motivo === "FINALIZADO") {
        return NextResponse.json(
          {
            error: "El proyecto fue finalizado: ya no se pueden confirmar cambios. Descartá tu borrador.",
            codigo: "PROYECTO_FINALIZADO",
          },
          { status: 409 },
        );
      }
      if (confirmacion.motivo === "SIN_BUILD") {
        return NextResponse.json(
          { error: "El proyecto no tiene una versión en desarrollo", codigo: "SIN_VERSION_EN_DESARROLLO" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        confirmacion.motivo === "CONFLICTO"
          ? {
              error: "Otro usuario confirmó cambios sobre elementos de tu borrador",
              codigo: "CONFLICTO_DE_EDICION",
              elementos: confirmacion.elementos,
            }
          : {
              error: "Los cambios no respetan las reglas del proyecto",
              codigo: "REGLA_DE_DOCUMENTACION",
              elementos: confirmacion.elementos,
            },
        { status: 409 },
      );
    }

    return NextResponse.json({ revisiones: confirmacion.revisiones, ids: confirmacion.ids });
  } catch (error) {
    return responderError("POST /api/proyectos/:id/cambios", error);
  }
}

export async function GET(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const acceso = await requerirAccesoAProyecto(id);
    if (!acceso) return proyectoNoEncontrado();

    const consulta = consultaCambiosSchema.safeParse({ desde: new URL(request.url).searchParams.get("desde") });
    if (!consulta.success) {
      return NextResponse.json({ error: "Datos inválidos", detalles: consulta.error.flatten() }, { status: 400 });
    }

    const [cambios, ahora] = await Promise.all([
      cambiosDeOtrosDesde(id, acceso.usuario.id, consulta.data.desde),
      ahoraEnLaBase(),
    ]);
    return NextResponse.json({ cambios, ahora });
  } catch (error) {
    return responderError("GET /api/proyectos/:id/cambios", error);
  }
}
