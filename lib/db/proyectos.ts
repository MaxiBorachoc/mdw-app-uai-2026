/**
 * Acceso a datos de la entidad Proyecto.
 *
 * Ningun componente ni Route Handler habla con Prisma directamente: todos pasan
 * por aca (ver AGENTS.md).
 */
import { prisma } from "@/lib/db/client";

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
