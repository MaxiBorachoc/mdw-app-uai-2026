/**
 * H14: acceso a datos de los entregables de un proyecto.
 *
 * Las funciones reciben el proyectoId ya autorizado por el Route Handler (solo el
 * dueño escribe; cualquier colaborador lee), y siempre lo usan en el where: un
 * entregable de otro proyecto no existe para este.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { EntregableInput, EntregableVista } from "@/lib/schemas/entregable";
import { fechaDeTexto, textoDeFecha } from "@/lib/utils";

const LIMITE_ENTREGABLES = 500;
const LIMITE_VERSIONES_POR_ENTREGABLE = 100;

const selectEntregable = {
  id: true,
  nombre: true,
  descripcion: true,
  fechaEstimada: true,
  entregado: true,
  fechaEntrega: true,
  versiones: {
    where: { estado: "CERRADA" },
    orderBy: { orden: "asc" },
    take: LIMITE_VERSIONES_POR_ENTREGABLE,
    select: { orden: true, numeroVersion: true, numeroBuild: true, numeroPatch: true },
  },
} satisfies Prisma.EntregableSelect;

type FilaEntregable = Prisma.EntregableGetPayload<{ select: typeof selectEntregable }>;

const etiquetaVersion = (v: { numeroVersion: number | null; numeroBuild: number | null; numeroPatch: number | null }) =>
  `${v.numeroVersion}.${v.numeroBuild}.${v.numeroPatch}`;

function aVista(fila: FilaEntregable): EntregableVista {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    fechaEstimada: textoDeFecha(fila.fechaEstimada),
    entregado: fila.entregado,
    fechaEntrega: fila.fechaEntrega ? textoDeFecha(fila.fechaEntrega) : null,
    // Los builds cerrados que apuntan a este entregable, del más viejo al más nuevo.
    versiones: fila.versiones.map((v) => ({ orden: v.orden, etiqueta: etiquetaVersion(v) })),
  };
}

const aDatos = (datos: EntregableInput) => ({
  nombre: datos.nombre,
  descripcion: datos.descripcion,
  fechaEstimada: fechaDeTexto(datos.fechaEstimada),
  entregado: datos.entregado,
  fechaEntrega: datos.fechaEntrega ? fechaDeTexto(datos.fechaEntrega) : null,
});

/** H14: los entregables del proyecto, ordenados por fecha estimada. */
export async function listarEntregables(proyectoId: string) {
  const filas = await prisma.entregable.findMany({
    where: { proyectoId },
    orderBy: [{ fechaEstimada: "asc" }, { creadoEn: "asc" }],
    take: LIMITE_ENTREGABLES,
    select: selectEntregable,
  });
  return filas.map(aVista);
}

export async function crearEntregable(proyectoId: string, datos: EntregableInput) {
  const fila = await prisma.entregable.create({ data: { ...aDatos(datos), proyectoId }, select: selectEntregable });
  return aVista(fila);
}

/** Devuelve null si el entregable no existe en ese proyecto. */
export async function actualizarEntregable(proyectoId: string, entregableId: string, datos: EntregableInput) {
  const { count } = await prisma.entregable.updateMany({ where: { id: entregableId, proyectoId }, data: aDatos(datos) });
  if (count === 0) return null;
  const fila = await prisma.entregable.findUnique({ where: { id: entregableId }, select: selectEntregable });
  return fila && aVista(fila);
}

export type ResultadoEliminacion =
  | { ok: true }
  | { ok: false; motivo: "NO_ENCONTRADO" }
  | { ok: false; motivo: "TIENE_VERSIONES"; versiones: string[] };

/**
 * H14: un entregable al que apunta algún build cerrado no se puede eliminar
 * (spec, sección 6). Si un cierre lo toma justo entre el chequeo y el borrado,
 * la clave foránea de la base lo rechaza igual y se informa lo mismo.
 */
export async function eliminarEntregable(proyectoId: string, entregableId: string): Promise<ResultadoEliminacion> {
  const entregable = await prisma.entregable.findFirst({ where: { id: entregableId, proyectoId }, select: selectEntregable });
  if (!entregable) return { ok: false, motivo: "NO_ENCONTRADO" };
  if (entregable.versiones.length > 0) {
    return { ok: false, motivo: "TIENE_VERSIONES", versiones: entregable.versiones.map(etiquetaVersion) };
  }
  try {
    await prisma.entregable.delete({ where: { id: entregableId } });
    return { ok: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      const versiones = await prisma.versionProyecto.findMany({
        where: { entregableId, estado: "CERRADA" },
        take: LIMITE_VERSIONES_POR_ENTREGABLE,
        select: { numeroVersion: true, numeroBuild: true, numeroPatch: true },
      });
      return { ok: false, motivo: "TIENE_VERSIONES", versiones: versiones.map(etiquetaVersion) };
    }
    throw error;
  }
}
