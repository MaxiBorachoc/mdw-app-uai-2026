/**
 * H2 — Listar y agregar colaboradores de un proyecto.
 *
 * Orden de las preguntas del handler: sesion (401), pertenencia (404), rol (403),
 * body (400), regla (409), consulta.
 */
import { NextResponse } from "next/server";
import { agregarMiembroSchema } from "@/lib/schemas/miembro";
import { validarAltaDeMiembro } from "@/lib/miembros-proyecto";
import { agregarMiembro, buscarUsuarioPorEmail, listarMiembrosDe } from "@/lib/db/miembros";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const acceso = await requerirAccesoAProyecto(id);
    if (!acceso) return proyectoNoEncontrado();

    return NextResponse.json(await listarMiembrosDe(id, acceso.usuario.id));
  } catch (error) {
    return responderError("GET /api/proyectos/:id/miembros", error);
  }
}

const MENSAJE_ALTA = {
  USUARIO_INEXISTENTE: "Se ingresó un usuario inexistente",
  ES_OWNER: "El owner del proyecto no puede agregarse como colaborador",
  YA_ES_MIEMBRO: "Ese usuario ya es colaborador del proyecto",
} as const;

export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    // H2: solo el owner administra los colaboradores.
    const acceso = await requerirAccesoAProyecto(id, ["OWNER"]);
    if (!acceso) return proyectoNoEncontrado();

    const body: unknown = await request.json().catch(() => null);
    const resultado = agregarMiembroSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten() },
        { status: 400 },
      );
    }
    const { email, rol } = resultado.data;

    const destino = await buscarUsuarioPorEmail(email);
    const miembros = await listarMiembrosDe(id, acceso.usuario.id);
    const veredicto = validarAltaDeMiembro(
      destino,
      acceso.usuario.id,
      miembros.map((m) => ({ usuarioId: m.usuario.id })),
    );
    if (!veredicto.ok) {
      return NextResponse.json(
        { error: MENSAJE_ALTA[veredicto.motivo], codigo: veredicto.motivo },
        { status: 409 },
      );
    }

    const miembro = destino ? await agregarMiembro(id, destino.id, rol) : null;
    if (!miembro) {
      // Otro request agrego al mismo usuario entre el chequeo y la escritura.
      return NextResponse.json(
        { error: MENSAJE_ALTA.YA_ES_MIEMBRO, codigo: "YA_ES_MIEMBRO" },
        { status: 409 },
      );
    }

    return NextResponse.json(miembro, { status: 201 });
  } catch (error) {
    return responderError("POST /api/proyectos/:id/miembros", error);
  }
}
