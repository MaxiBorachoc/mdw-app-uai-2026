/**
 * Autorizacion de los Route Handlers que operan sobre un proyecto. Contesta,
 * en orden, las tres preguntas del handler (ver docs/api.md):
 *
 *   1. ¿hay sesion?           no → lanza NoAutenticado (401)
 *   2. ¿es de este proyecto?  no → devuelve null (el handler responde 404)
 *   3. ¿su rol alcanza?       no → lanza NoAutorizado (403)
 *
 * La pertenencia (2) va antes que el rol (3) porque los roles viven en
 * MiembroProyecto: sin membresia no hay rol que evaluar. Un proyecto ajeno y un
 * proyecto inexistente se responden igual, para no revelar cual de los dos es.
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
  if (!membresia) return null;

  if (rolesPermitidos && !rolesPermitidos.includes(membresia.rol)) {
    throw new NoAutorizado();
  }

  return { usuario, rol: membresia.rol };
}

export function proyectoNoEncontrado() {
  return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
}
