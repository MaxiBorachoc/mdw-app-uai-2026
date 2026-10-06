/**
 * H2 — Listar y agregar (invitar) colaboradores de un proyecto.
 *
 * Orden de las preguntas del handler: sesion (401), pertenencia (404), rol (403),
 * body (400), regla (409), consulta. El mail de invitacion es accesorio (ver
 * docs/spec.md seccion 8): va DESPUES de que la invitacion ya quedo creada.
 */
import { NextResponse } from "next/server";
import { agregarMiembroSchema } from "@/lib/schemas/miembro";
import { validarAltaDeMiembro } from "@/lib/miembros-proyecto";
import {
  buscarUsuarioPorEmail,
  invitarMiembro,
  listarMiembrosDe,
  obtenerMembresia,
} from "@/lib/db/miembros";
import { enviarInvitacion } from "@/lib/servicios/mail";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const acceso = await requerirAccesoAProyecto(id);
    if (!acceso) return proyectoNoEncontrado();

    // H2: pendientes y rechazadas solo las ve el dueño.
    const soloAceptados = acceso.rol !== "OWNER";
    return NextResponse.json(await listarMiembrosDe(id, acceso.usuario.id, soloAceptados));
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
    const membresiaExistente = destino ? await obtenerMembresia(destino.id, id) : null;
    const veredicto = validarAltaDeMiembro(destino, acceso.usuario.id, membresiaExistente);
    if (!veredicto.ok) {
      return NextResponse.json(
        { error: MENSAJE_ALTA[veredicto.motivo], codigo: veredicto.motivo },
        { status: 409 },
      );
    }

    // destino no puede ser null aca: si lo fuera, el veredicto ya fue USUARIO_INEXISTENTE.
    const invitacion = await invitarMiembro(id, destino!.id, rol);

    // Accesorio (seccion 8): la invitacion ya quedo pendiente en la base
    // aunque el correo falle.
    await enviarInvitacion({
      destinatario: invitacion.usuario.email,
      nombreProyecto: invitacion.proyecto.nombre,
      rol,
      proyectoId: id,
      usuarioId: destino!.id,
    });

    return NextResponse.json(
      { rol: invitacion.rol, estado: invitacion.estado, creadoEn: invitacion.creadoEn, usuario: invitacion.usuario },
      { status: 201 },
    );
  } catch (error) {
    return responderError("POST /api/proyectos/:id/miembros", error);
  }
}
