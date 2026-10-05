/**
 * Acceso a datos de la entidad Proyecto.
 *
 * Ningun componente ni Route Handler habla con Prisma directamente: todos pasan
 * por aca (ver AGENTS.md).
 */
import { prisma } from "@/lib/db/client";
import type { CrearProyectoInput } from "@/lib/schemas/proyecto";

const LIMITE_POR_DEFECTO = 50;

export async function listarProyectosDe(usuarioId: string, limite: number = LIMITE_POR_DEFECTO) {
  return prisma.proyecto.findMany({
    where: { miembros: { some: { usuarioId } } },
    take: limite,
    orderBy: { creadoEn: "desc" },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      creadoEn: true,
      owner: { select: { id: true, nombre: true } },
    },
  });
}

export async function obtenerProyecto(id: string) {
  return prisma.proyecto.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      creadoEn: true,
      owner: { select: { id: true, nombre: true } },
      miembros: {
        take: 200,
        select: {
          id: true,
          rol: true,
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      },
    },
  });
}

/** Crea el proyecto, su membresía OWNER y la primera versión en desarrollo. */
export async function crearProyecto(datos: CrearProyectoInput, ownerId: string) {
  return prisma.proyecto.create({
    data: {
      ...datos,
      ownerId,
      miembros: { create: { usuarioId: ownerId, rol: "OWNER" } },
      versiones: { create: { estado: "EN_DESARROLLO", autorId: ownerId } },
    },
    select: { id: true, nombre: true, descripcion: true, creadoEn: true, ownerId: true },
  });
}

/** Devuelve null cuando el proyecto no existe. */
export async function actualizarProyecto(id: string, datos: CrearProyectoInput) {
  const { count } = await prisma.proyecto.updateMany({ where: { id }, data: datos });
  if (count === 0) return null;

  return prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, nombre: true, descripcion: true, creadoEn: true, ownerId: true },
  });
}

/** H1: el borrado del proyecto elimina en cascada todo su historial. */
export async function eliminarProyecto(id: string) {
  const { count } = await prisma.proyecto.deleteMany({ where: { id } });
  return count > 0;
}
