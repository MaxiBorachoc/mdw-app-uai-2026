/**
 * Consultas de lectura para las pantallas de proyectos.
 *
 * Siguen la regla de la cátedra: la UI de servidor lee lib/db directamente y
 * toda consulta queda acotada por el id del usuario autenticado.
 */
import { prisma } from "@/lib/db/client";

const LIMITE_PROYECTOS = 50;

export async function listarProyectosParaVista(usuarioId: string) {
  const filas = await prisma.proyecto.findMany({
    where: {
      miembros: {
        some: { usuarioId, estado: "ACEPTADA" },
      },
    },
    orderBy: { creadoEn: "desc" },
    take: LIMITE_PROYECTOS,
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      creadoEn: true,
      owner: { select: { id: true, nombre: true } },
      miembros: {
        where: { usuarioId, estado: "ACEPTADA" },
        take: 1,
        select: { rol: true },
      },
    },
  });

  return filas.flatMap((proyecto) => {
    const rol = proyecto.miembros[0]?.rol;
    if (!rol) return [];

    return [
      {
        id: proyecto.id,
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion,
        creadoEn: proyecto.creadoEn,
        owner: proyecto.owner,
        rol,
      },
    ];
  });
}

export async function obtenerProyectoParaVista(id: string, usuarioId: string) {
  return prisma.proyecto.findFirst({
    where: {
      id,
      miembros: {
        some: { usuarioId, estado: "ACEPTADA" },
      },
    },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      creadoEn: true,
      owner: { select: { id: true, nombre: true } },
      miembros: {
        where: { estado: "ACEPTADA" },
        orderBy: { creadoEn: "asc" },
        take: 200,
        select: {
          rol: true,
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      },
      versiones: {
        where: { estado: "EN_DESARROLLO" },
        orderBy: { creadoEn: "desc" },
        take: 1,
        select: { id: true, estado: true, creadoEn: true },
      },
    },
  });
}
