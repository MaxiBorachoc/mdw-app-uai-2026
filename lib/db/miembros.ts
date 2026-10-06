/**
 * Membresias por proyecto: los roles (OWNER/EDITOR/READER) no son globales,
 * viven en MiembroProyecto, igual que el estado de la invitacion. La decision
 * de que status HTTP devolver (401/403/404) vive en lib/api/autorizar.ts;
 * aca solo se lee y se escribe.
 */
import { prisma } from "@/lib/db/client";
import type { RolColaborador } from "@/lib/schemas/miembro";

export async function obtenerMembresia(usuarioId: string, proyectoId: string) {
  return prisma.miembroProyecto.findUnique({
    where: { usuarioId_proyectoId: { usuarioId, proyectoId } },
    select: { id: true, rol: true, estado: true, usuarioId: true, proyectoId: true },
  });
}

// Solo devuelve algo si `usuarioId` (el de la sesion) pertenece al proyecto.
// `soloAceptados` filtra las invitaciones pendientes/rechazadas: las decide
// el llamador segun el rol del solicitante (H2: solo el dueño las ve todas).
export async function listarMiembrosDe(proyectoId: string, usuarioId: string, soloAceptados: boolean) {
  return prisma.miembroProyecto.findMany({
    where: {
      proyectoId,
      proyecto: { miembros: { some: { usuarioId } } },
      ...(soloAceptados ? { estado: "ACEPTADA" as const } : {}),
    },
    select: {
      rol: true,
      estado: true,
      creadoEn: true,
      usuario: { select: { id: true, nombre: true, email: true } },
    },
    orderBy: { creadoEn: "asc" },
    take: 200,
  });
}

// Los emails se guardan como los entrega Google; se compara sin distinguir mayusculas.
export async function buscarUsuarioPorEmail(email: string) {
  return prisma.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, nombre: true },
  });
}

// Crea la invitacion en PENDIENTE, o la reabre si la anterior fue RECHAZADA
// (mismo upsert: el @@unique de (usuarioId, proyectoId) hace que solo pueda
// haber una fila por par). La validacion de "no reabrir una pendiente o
// aceptada" ya la hizo validarAltaDeMiembro antes de llegar aca.
export async function invitarMiembro(proyectoId: string, usuarioId: string, rol: RolColaborador) {
  return prisma.miembroProyecto.upsert({
    where: { usuarioId_proyectoId: { usuarioId, proyectoId } },
    create: { proyectoId, usuarioId, rol, estado: "PENDIENTE" },
    update: { rol, estado: "PENDIENTE" },
    select: {
      rol: true,
      estado: true,
      creadoEn: true,
      usuario: { select: { id: true, nombre: true, email: true } },
      proyecto: { select: { nombre: true } },
    },
  });
}

// El where lleva al invitado: solo puede aceptar o rechazar su propia
// invitacion, y solo si sigue PENDIENTE. Devuelve false si no se cambio nada.
export async function aceptarInvitacion(proyectoId: string, usuarioId: string) {
  const { count } = await prisma.miembroProyecto.updateMany({
    where: { proyectoId, usuarioId, estado: "PENDIENTE" },
    data: { estado: "ACEPTADA" },
  });
  return count > 0;
}

export async function rechazarInvitacion(proyectoId: string, usuarioId: string) {
  const { count } = await prisma.miembroProyecto.updateMany({
    where: { proyectoId, usuarioId, estado: "PENDIENTE" },
    data: { estado: "RECHAZADA" },
  });
  return count > 0;
}

// El where lleva al solicitante: solo escribe si es OWNER del proyecto, el
// objetivo no es el OWNER, y su invitacion esta ACEPTADA (H2: no tiene
// sentido asignarle un rol a quien todavia no acepto o ya rechazo).
export async function cambiarRolDeMiembro(
  proyectoId: string,
  usuarioId: string,
  rol: RolColaborador,
  solicitanteId: string,
) {
  const { count } = await prisma.miembroProyecto.updateMany({
    where: {
      proyectoId,
      usuarioId,
      rol: { not: "OWNER" },
      estado: "ACEPTADA",
      proyecto: { miembros: { some: { usuarioId: solicitanteId, rol: "OWNER" } } },
    },
    data: { rol },
  });
  return count > 0;
}

// Datos para el correo de despedida: se leen ANTES de quitarMiembro, porque
// despues de borrar la fila ya no hay de donde sacar el email ni el nombre
// del proyecto.
export async function obtenerDatosParaDespedida(proyectoId: string, usuarioId: string) {
  return prisma.miembroProyecto.findUnique({
    where: { usuarioId_proyectoId: { usuarioId, proyectoId } },
    select: {
      usuario: { select: { email: true } },
      proyecto: { select: { nombre: true } },
    },
  });
}

// El where lleva al solicitante: el OWNER del proyecto puede quitar a cualquiera
// (en cualquier estado de invitacion) y un colaborador solo a si mismo. El
// OWNER nunca se quita. Devuelve false si no se borro nada.
export async function quitarMiembro(proyectoId: string, usuarioId: string, solicitanteId: string) {
  const { count } = await prisma.miembroProyecto.deleteMany({
    where: {
      proyectoId,
      usuarioId,
      rol: { not: "OWNER" },
      OR: [
        { usuarioId: solicitanteId },
        { proyecto: { miembros: { some: { usuarioId: solicitanteId, rol: "OWNER" } } } },
      ],
    },
  });
  return count > 0;
}
