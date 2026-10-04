/**
 * Acceso a datos de la entidad Nota.
 */
import { prisma } from "@/lib/db/client";
import type { CrearNotaInput } from "@/lib/schemas/nota";

const LIMITE_POR_DEFECTO = 50;

export async function listarNotas(limite: number = LIMITE_POR_DEFECTO) {
  // Toda consulta que devuelve listas lleva límite explícito.
  return prisma.nota.findMany({
    take: limite,
    orderBy: { creadaEn: "desc" },
    select: {
      id: true,
      titulo: true,
      contenido: true,
      creadaEn: true,
      autor: { select: { id: true, nombre: true } },
    },
  });
}

export async function obtenerNota(id: string) {
  return prisma.nota.findUnique({ where: { id } });
}

export async function crearNota(datos: CrearNotaInput, autorId: string) {
  // `autorId` se recibe por parámetro y sale de la sesión del servidor,
  // nunca del body del request: el cliente no decide de quién es la nota.
  return prisma.nota.create({
    data: { ...datos, autorId },
  });
}
