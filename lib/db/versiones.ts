/**
 * H8: cerrar la version en desarrollo de un proyecto. No es un ABM: es la
 * operacion del flujo principal que mueve al proyecto de un build al siguiente
 * (ver docs/spec.md seccion 4, H8).
 *
 * Cerrar no copia documentacion: el estado de un build cerrado se reconstruye a
 * partir de las revisiones confirmadas hasta el (lib/documentacion.ts).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { bloquearBuildEnDesarrollo } from "@/lib/db/documentacion";
import type { CerrarVersionProyectoInput } from "@/lib/schemas/versionProyecto";
import { validarCierreDeVersion, type NumeroVersion, type VeredictoCierre } from "@/lib/versiones-proyecto";

export type ResultadoCierre =
  | {
      ok: true;
      cerrada: {
        id: string;
        orden: number;
        estado: string;
        numeroVersion: number | null;
        numeroBuild: number | null;
        numeroPatch: number | null;
        nombre: string | null;
        descripcion: string | null;
        cerradaEl: Date | null;
        entregable: { id: string; nombre: string } | null;
      };
      siguiente: { id: string; orden: number; estado: string };
    }
  | { ok: false; veredicto: Extract<VeredictoCierre, { ok: false }> }
  // H8: el proyecto no tiene entregables, o el elegido no existe en este proyecto.
  | { ok: false; entregable: "SIN_ENTREGABLES" | "INEXISTENTE" };

/**
 * Cierra el build en desarrollo y abre el siguiente, todo en una transaccion que
 * bloquea el build en desarrollo: asi un cierre no se mezcla con una confirmacion
 * de cambios ni con otro cierre simultaneo (spec, seccion 6).
 */
export async function cerrarVersionEnDesarrollo(
  proyectoId: string,
  datos: CerrarVersionProyectoInput,
): Promise<ResultadoCierre> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Los proyectos anteriores a la regla "siempre hay un build en desarrollo"
      // podrian no tenerlo: se lo abre al final antes de cerrar.
      let build = await bloquearBuildEnDesarrollo(tx, proyectoId);
      if (!build) {
        const ultimo = await tx.versionProyecto.findFirst({
          where: { proyectoId },
          orderBy: { orden: "desc" },
          select: { orden: true },
        });
        await tx.versionProyecto.create({
          data: { proyectoId, orden: (ultimo?.orden ?? 0) + 1, estado: "EN_DESARROLLO" },
        });
        build = await bloquearBuildEnDesarrollo(tx, proyectoId);
      }
      if (!build) throw new Error("No se pudo abrir el build en desarrollo");

      // H8: todo cierre corresponde a un entregable del mismo proyecto.
      const [entregables, elegido] = await Promise.all([
        tx.entregable.count({ where: { proyectoId } }),
        tx.entregable.findFirst({ where: { id: datos.entregableId, proyectoId }, select: { id: true } }),
      ]);
      if (entregables === 0) return { ok: false as const, entregable: "SIN_ENTREGABLES" as const };
      if (!elegido) return { ok: false as const, entregable: "INEXISTENTE" as const };

      const [cerradas, cambios] = await Promise.all([
        listarVersionesCerradas(proyectoId, tx),
        contarRevisionesDelBuild(build.id, tx),
      ]);
      const veredicto = validarCierreDeVersion(datos, cerradas, cambios > 0);
      if (!veredicto.ok) return { ok: false as const, veredicto };

      const cerrada = await tx.versionProyecto.update({
        where: { id: build.id },
        data: {
          estado: "CERRADA",
          numeroVersion: datos.numeroVersion,
          numeroBuild: datos.numeroBuild,
          numeroPatch: datos.numeroPatch,
          nombre: datos.nombre || null,
          descripcion: datos.descripcion || null,
          cerradaEl: new Date(),
          entregableId: elegido.id,
        },
        select: {
          id: true,
          orden: true,
          estado: true,
          numeroVersion: true,
          numeroBuild: true,
          numeroPatch: true,
          nombre: true,
          descripcion: true,
          cerradaEl: true,
          entregable: { select: { id: true, nombre: true } },
        },
      });
      const siguiente = await tx.versionProyecto.create({
        data: { proyectoId, orden: build.orden + 1, estado: "EN_DESARROLLO" },
        select: { id: true, orden: true, estado: true },
      });
      return { ok: true as const, cerrada, siguiente };
    });
  } catch (error) {
    // Ultima linea de defensa: el @@unique del schema rechaza una combinacion
    // repetida aunque la regla de arriba se haya saltado de algun modo.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, veredicto: { ok: false, motivo: "DUPLICADA", version: datos } };
    }
    // El entregable se borro entre el chequeo y el cierre: la clave foranea lo rechaza.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { ok: false, entregable: "INEXISTENTE" };
    }
    throw error;
  }
}

async function listarVersionesCerradas(proyectoId: string, db: Prisma.TransactionClient): Promise<NumeroVersion[]> {
  const filas = await db.versionProyecto.findMany({
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

// H8: un build tiene cambios si se confirmo alguna revision de cualquier elemento en el.
async function contarRevisionesDelBuild(versionProyectoId: string, db: Prisma.TransactionClient) {
  const [historias, actividades, conexiones] = await Promise.all([
    db.historiaUsuarioVersion.count({ where: { versionProyectoId } }),
    db.actividadVersion.count({ where: { versionProyectoId } }),
    db.conexionActividadVersion.count({ where: { versionProyectoId } }),
  ]);
  return historias + actividades + conexiones;
}
