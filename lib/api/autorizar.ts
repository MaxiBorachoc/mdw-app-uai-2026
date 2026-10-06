/**
 * Autorizacion de los Route Handlers que operan sobre un proyecto. Contesta,
 * en orden, las tres preguntas del handler (ver docs/api.md):
 *
 *   1. ¿hay sesion?              no → lanza NoAutenticado (401)
 *   2. ¿es colaborador aceptado? no → devuelve null (el handler responde 404)
 *   3. ¿su rol alcanza?          no → lanza NoAutorizado (403)
 *
 * La pertenencia (2) va antes que el rol (3) porque los roles viven en
 * MiembroProyecto: sin membresia no hay rol que evaluar. Un proyecto ajeno, uno
 * inexistente y una invitacion todavia pendiente o ya rechazada se responden
 * igual (404): H2 dice que mientras la invitacion no este aceptada, el usuario
 * no tiene acceso al proyecto. La excepcion son los endpoints de aceptar y
 * rechazar la invitacion, que leen la membresia ellos mismos sin pasar por
 * aca, porque para esos dos "pendiente" es justamente el caso que manejan.
 */
import { NextResponse } from "next/server";
import type { RolProyecto } from "@prisma/client";
import { NoAutorizado, requerirUsuario, type UsuarioSesion } from "@/lib/auth";
import { obtenerMembresia } from "@/lib/db/miembros";

export type AccesoAProyecto = { usuario: UsuarioSesion; rol: RolProyecto };

export async function requerirAccesoAProyecto(
  proyectoId: string,
  rolesPermitidos?: RolProyecto[],
): Promise<AccesoAProyecto | null> {
  const usuario = await requerirUsuario();

  const membresia = await obtenerMembresia(usuario.id, proyectoId);
  if (!membresia || membresia.estado !== "ACEPTADA") return null;

  if (rolesPermitidos && !rolesPermitidos.includes(membresia.rol)) {
    throw new NoAutorizado();
  }

  return { usuario, rol: membresia.rol };
}

export function proyectoNoEncontrado() {
  return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
}
