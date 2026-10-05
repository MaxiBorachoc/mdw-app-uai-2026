/**
 * H8: cierre de una versión de proyecto. Al cerrar se congelan las revisiones
 * actuales de historias y actividades, y se abre la siguiente versión.
 */
import { prisma } from "@/lib/db/client";
import type { CerrarVersionProyectoInput } from "@/lib/schemas/versionProyecto";

export async function obtenerVersionEnDesarrollo(proyectoId: string) {
  return prisma.versionProyecto.findFirst({
    where: { proyectoId, estado: "EN_DESARROLLO" },
    select: { id: true, proyectoId: true, estado: true },
  });
}

export async function cerrarVersionEnDesarrollo(
  proyectoId: string,
  datos: CerrarVersionProyectoInput,
  autorId: string,
) {
  const versionEnDesarrollo =
    (await obtenerVersionEnDesarrollo(proyectoId)) ??
    (await prisma.versionProyecto.create({
      data: { proyectoId, estado: "EN_DESARROLLO", autorId },
      select: { id: true, proyectoId: true, estado: true },
    }));

  const [historias, actividades] = await Promise.all([
    prisma.historiaUsuario.findMany({
      where: { proyectoId, versionActualId: { not: null } },
      select: { versionActualId: true },
    }),
    prisma.actividad.findMany({
      where: { proyectoId, versionActualId: { not: null } },
      select: { versionActualId: true },
    }),
  ]);

  return prisma.$transaction(async (tx) => {
    const cerrada = await tx.versionProyecto.update({
      where: { id: versionEnDesarrollo.id },
      data: {
        estado: "CERRADA",
        numeroVersion: datos.numeroVersion,
        numeroBuild: datos.numeroBuild,
        numeroPatch: datos.numeroPatch,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        cerradaEl: new Date(),
        items: {
          create: [
            ...historias.map((historia) => ({
              tipo: "HISTORIA" as const,
              historiaUsuarioVersionId: historia.versionActualId!,
            })),
            ...actividades.map((actividad) => ({
              tipo: "ACTIVIDAD" as const,
              actividadVersionId: actividad.versionActualId!,
            })),
          ],
        },
      },
      select: {
        id: true,
        estado: true,
        numeroVersion: true,
        numeroBuild: true,
        numeroPatch: true,
        nombre: true,
        descripcion: true,
        cerradaEl: true,
      },
    });

    const siguiente = await tx.versionProyecto.create({
      data: { proyectoId, estado: "EN_DESARROLLO", autorId },
      select: { id: true, estado: true },
    });

    return { cerrada, siguiente };
  });
}
