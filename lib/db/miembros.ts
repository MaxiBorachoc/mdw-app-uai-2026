/**
 * Membresias por proyecto: los roles (OWNER/EDITOR/READER) no son globales,
 * viven en MiembroProyecto. La decision de que status devolver (401/403/404)
 * vive en lib/api/autorizar.ts; aca solo se lee y se escribe.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { RolColaborador } from "@/lib/schemas/miembro";

export async function obtenerMembresia(usuarioId: string, proyectoId: string) {
  return prisma.miembroProyecto.findUnique({
    where: { usuarioId_proyectoId: { usuarioId, proyectoId } },
    select: { id: true, rol: true, usuarioId: true, proyectoId: true },
  });
}

// Solo devuelve algo si `usuarioId` (el de la sesion) pertenece al proyecto.
export async function listarMiembrosDe(proyectoId: string, usuarioId: string) {
  return prisma.miembroProyecto.findMany({
    where: { proyectoId, proyecto: { miembros: { some: { usuarioId } } } },
    select: {
      rol: true,
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

// Devuelve null si otro request agrego al mismo usuario entre el chequeo y la
// escritura (el @@unique de MiembroProyecto lo rechaza).
export async function agregarMiembro(proyectoId: string, usuarioId: string, rol: RolColaborador) {
  try {
    return await prisma.miembroProyecto.create({
      data: { proyectoId, usuarioId, rol },
      select: {
        rol: true,
        creadoEn: true,
        usuario: { select: { id: true, nombre: true, email: true } },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null;
    }
    throw error;
  }
}

// El where lleva al solicitante: solo escribe si es OWNER del proyecto. El rol
// OWNER nunca se modifica. Devuelve false si no se cambio nada.
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
      proyecto: { miembros: { some: { usuarioId: solicitanteId, rol: "OWNER" } } },
    },
    data: { rol },
  });
  return count > 0;
}

// El where lleva al solicitante: el OWNER del proyecto puede quitar a cualquiera y
// un colaborador solo a si mismo. El OWNER nunca se quita. Devuelve false si no
// se borro nada.
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
