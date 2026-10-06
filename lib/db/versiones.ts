/**
 * H8: cerrar la version en desarrollo de un proyecto. No es un ABM — es la
 * operacion del flujo principal que mueve al proyecto de un hito al
 * siguiente (ver docs/spec.md seccion 4, H8).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { CerrarVersionProyectoInput } from "@/lib/schemas/versionProyecto";
import type { NumeroVersion } from "@/lib/versiones-proyecto";

export async function listarVersionesCerradas(proyectoId: string): Promise<NumeroVersion[]> {
  const filas = await prisma.versionProyecto.findMany({
    where: { proyectoId, estado: "CERRADA" },
    select: { numeroVersion: true, numeroBuild: true, numeroPatch: true },
    take: 1000,
  });

  // Una version CERRADA siempre tiene los tres numeros; el schema los deja nulos
  // solo mientras esta EN_DESARROLLO.
  return filas.flatMap((f) =>
    f.numeroVersion !== null && f.numeroBuild !== null && f.numeroPatch !== null
      ? [{ numeroVersion: f.numeroVersion, numeroBuild: f.numeroBuild, numeroPatch: f.numeroPatch }]
      : [],
  );
}

export async function obtenerVersionEnDesarrollo(proyectoId: string) {
  return prisma.versionProyecto.findFirst({
    where: { proyectoId, estado: "EN_DESARROLLO" },
    select: { id: true, proyectoId: true, estado: true },
  });
}

// Congela la version actual de cada historia y actividad del proyecto en la
// version que se cierra, y abre la siguiente version en desarrollo para que
// el equipo siga trabajando (H8, criterio de aceptacion (a) y (b)).
export async function cerrarVersionEnDesarrollo(proyectoId: string, datos: CerrarVersionProyectoInput) {
  // Los proyectos creados antes de que crearProyecto abriera la primera version
  // no tienen una EN_DESARROLLO: se la crea aca para respetar la regla de la spec.
  const versionEnDesarrollo =
    (await obtenerVersionEnDesarrollo(proyectoId)) ??
    (await prisma.versionProyecto.create({
      data: { proyectoId, estado: "EN_DESARROLLO" },
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

  try {
    const resultado = await prisma.$transaction(async (tx) => {
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
            ...historias.map((h) => ({
              tipo: "HISTORIA" as const,
              historiaUsuarioVersionId: h.versionActualId!,
            })),
            ...actividades.map((a) => ({
              tipo: "ACTIVIDAD" as const,
              actividadVersionId: a.versionActualId!,
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
      data: { proyectoId, estado: "EN_DESARROLLO" },
      select: { id: true, estado: true },
    });

    return { cerrada, siguiente };
    });
    return { ok: true as const, ...resultado };
  } catch (error) {
    // Ultima linea de defensa (dos cierres simultaneos con la misma combinacion):
    // el @@unique del schema la rechaza y se traduce a un resultado esperado.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const };
    }
    throw error;
  }
}
