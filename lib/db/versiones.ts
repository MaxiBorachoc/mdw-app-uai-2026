/**
 * H8: cerrar la version en desarrollo de un proyecto, y H15: finalizar y reabrir
 * el proyecto. No son ABM: son las operaciones del flujo principal que mueven al
 * proyecto de un build al siguiente (ver docs/spec.md secciones 4 y 6).
 *
 * Cerrar no copia documentacion: el estado de un build cerrado se reconstruye a
 * partir de las revisiones confirmadas hasta el (lib/documentacion.ts).
 *
 * Todo pasa en transacciones que bloquean el build en desarrollo: un cierre, una
 * finalizacion y una confirmacion de cambios del mismo proyecto nunca se mezclan.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { bloquearBuildEnDesarrollo } from "@/lib/db/documentacion";
import type { CerrarVersionProyectoInput, FinalizarProyectoInput } from "@/lib/schemas/versionProyecto";
import {
  decidirFinalizacion,
  validarCierreDeVersion,
  type NumeroVersion,
  type VeredictoCierre,
} from "@/lib/versiones-proyecto";

const selectCerrada = {
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
} satisfies Prisma.VersionProyectoSelect;

type Cerrada = Prisma.VersionProyectoGetPayload<{ select: typeof selectCerrada }>;

// Por que no se pudo cerrar: las reglas de numeracion, el entregable, o que el
// proyecto ya esta finalizado (H15: no tiene build en desarrollo).
export type FallaCierre =
  | { ok: false; veredicto: Extract<VeredictoCierre, { ok: false }> }
  | { ok: false; entregable: "SIN_ENTREGABLES" | "INEXISTENTE" }
  | { ok: false; proyecto: "FINALIZADO" };

export type ResultadoCierre =
  | { ok: true; cerrada: Cerrada; siguiente: { id: string; orden: number; estado: string } }
  | FallaCierre;

type Build = { id: string; orden: number };

/**
 * H8: valida y cierra el build que ya esta bloqueado, sin abrir el siguiente
 * (eso lo decide quien llama: cerrar una version lo abre; finalizar, no).
 */
async function cerrarBuild(
  tx: Prisma.TransactionClient,
  proyectoId: string,
  build: Build,
  datos: CerrarVersionProyectoInput,
): Promise<{ ok: true; cerrada: Cerrada } | FallaCierre> {
  // Todo cierre corresponde a un entregable del mismo proyecto.
  const [entregables, elegido] = await Promise.all([
    tx.entregable.count({ where: { proyectoId } }),
    tx.entregable.findFirst({ where: { id: datos.entregableId, proyectoId }, select: { id: true } }),
  ]);
  if (entregables === 0) return { ok: false, entregable: "SIN_ENTREGABLES" };
  if (!elegido) return { ok: false, entregable: "INEXISTENTE" };

  const [cerradas, cambios] = await Promise.all([
    listarVersionesCerradas(proyectoId, tx),
    contarRevisionesDelBuild(build.id, tx),
  ]);
  const veredicto = validarCierreDeVersion(datos, cerradas, cambios > 0);
  if (!veredicto.ok) return { ok: false, veredicto };

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
    select: selectCerrada,
  });
  return { ok: true, cerrada };
}

/**
 * Las fallas de la base que corresponden a reglas: el @@unique de Version.Build.Patch
 * (dos cierres simultaneos con el mismo numero) y la clave foranea del entregable
 * (se borro entre el chequeo y el cierre). Cualquier otra se relanza.
 */
function traducirErrorDeCierre(error: unknown, datos: CerrarVersionProyectoInput): FallaCierre {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { ok: false, veredicto: { ok: false, motivo: "DUPLICADA", version: datos } };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return { ok: false, entregable: "INEXISTENTE" };
  }
  throw error;
}

async function estaFinalizado(tx: Prisma.TransactionClient, proyectoId: string) {
  const proyecto = await tx.proyecto.findUnique({ where: { id: proyectoId }, select: { estado: true } });
  return proyecto?.estado === "FINALIZADO";
}

/** H8: cierra el build en desarrollo y abre el siguiente. */
export async function cerrarVersionEnDesarrollo(
  proyectoId: string,
  datos: CerrarVersionProyectoInput,
): Promise<ResultadoCierre> {
  try {
    return await prisma.$transaction(async (tx) => {
      let build = await bloquearBuildEnDesarrollo(tx, proyectoId);
      if (!build) {
        // H15: un proyecto finalizado no tiene build en desarrollo a proposito.
        if (await estaFinalizado(tx, proyectoId)) return { ok: false as const, proyecto: "FINALIZADO" as const };
        // Los proyectos anteriores a la regla "siempre hay un build en desarrollo"
        // podrian no tenerlo: se lo abre al final antes de cerrar.
        await tx.versionProyecto.create({
          data: { proyectoId, orden: (await ultimoOrden(tx, proyectoId)) + 1, estado: "EN_DESARROLLO" },
        });
        build = await bloquearBuildEnDesarrollo(tx, proyectoId);
      }
      if (!build) throw new Error("No se pudo abrir el build en desarrollo");

      const cierre = await cerrarBuild(tx, proyectoId, build, datos);
      if (!cierre.ok) return cierre;

      const siguiente = await tx.versionProyecto.create({
        data: { proyectoId, orden: build.orden + 1, estado: "EN_DESARROLLO" },
        select: { id: true, orden: true, estado: true },
      });
      return { ok: true as const, cerrada: cierre.cerrada, siguiente };
    });
  } catch (error) {
    return traducirErrorDeCierre(error, datos);
  }
}

export type ResultadoFinalizacion =
  | { ok: true; cerrada: Cerrada | null }
  | { ok: false; motivo: "YA_FINALIZADO" | "CIERRE_REQUERIDO" | "NADA_QUE_FINALIZAR" }
  | FallaCierre;

/**
 * H15: finaliza el proyecto. Si el build en desarrollo tiene cambios, lo cierra
 * con los datos recibidos (mismas reglas que H8) y no abre otro; si esta vacio,
 * lo descarta. En los dos casos el proyecto queda FINALIZADO, sin build en
 * desarrollo.
 */
export async function finalizarProyecto(proyectoId: string, datos: FinalizarProyectoInput): Promise<ResultadoFinalizacion> {
  try {
    return await prisma.$transaction(async (tx) => {
      const build = await bloquearBuildEnDesarrollo(tx, proyectoId);
      if (!build) {
        return (await estaFinalizado(tx, proyectoId))
          ? { ok: false as const, motivo: "YA_FINALIZADO" as const }
          : { ok: false as const, motivo: "NADA_QUE_FINALIZAR" as const };
      }

      const [cambios, cerradas] = await Promise.all([
        contarRevisionesDelBuild(build.id, tx),
        tx.versionProyecto.count({ where: { proyectoId, estado: "CERRADA" } }),
      ]);
      const decision = decidirFinalizacion({
        tieneCambios: cambios > 0,
        hayVersionesCerradas: cerradas > 0,
        vinoElCierre: datos.cierre !== undefined,
      });
      if (decision.accion === "RECHAZAR") return { ok: false as const, motivo: decision.motivo };

      let cerrada: Cerrada | null = null;
      if (decision.accion === "CERRAR_Y_FINALIZAR" && datos.cierre) {
        const cierre = await cerrarBuild(tx, proyectoId, build, datos.cierre);
        if (!cierre.ok) return cierre;
        cerrada = cierre.cerrada;
      } else {
        // Vacio: no tiene revisiones que lo referencien, se puede borrar.
        await tx.versionProyecto.delete({ where: { id: build.id } });
      }

      await tx.proyecto.update({ where: { id: proyectoId }, data: { estado: "FINALIZADO" } });
      return { ok: true as const, cerrada };
    });
  } catch (error) {
    if (!datos.cierre) throw error;
    return traducirErrorDeCierre(error, datos.cierre);
  }
}

export type ResultadoReapertura =
  | { ok: true; siguiente: { id: string; orden: number; estado: string } }
  | { ok: false; motivo: "EN_PROCESO" };

/**
 * H15: reabre un proyecto finalizado: abre un build en desarrollo nuevo, con el
 * orden siguiente al ultimo. El cambio de estado es un "comparar y cambiar": si
 * dos pedidos llegan juntos, solo uno encuentra el proyecto FINALIZADO.
 */
export async function reabrirProyecto(proyectoId: string): Promise<ResultadoReapertura> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.proyecto.updateMany({
      where: { id: proyectoId, estado: "FINALIZADO" },
      data: { estado: "EN_PROCESO" },
    });
    if (count === 0) return { ok: false as const, motivo: "EN_PROCESO" as const };

    const siguiente = await tx.versionProyecto.create({
      data: { proyectoId, orden: (await ultimoOrden(tx, proyectoId)) + 1, estado: "EN_DESARROLLO" },
      select: { id: true, orden: true, estado: true },
    });
    return { ok: true as const, siguiente };
  });
}

async function ultimoOrden(tx: Prisma.TransactionClient, proyectoId: string) {
  const ultimo = await tx.versionProyecto.findFirst({
    where: { proyectoId },
    orderBy: { orden: "desc" },
    select: { orden: true },
  });
  return ultimo?.orden ?? 0;
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
  const [historias, actividades, conexiones, carriles] = await Promise.all([
    db.historiaUsuarioVersion.count({ where: { versionProyectoId } }),
    db.actividadVersion.count({ where: { versionProyectoId } }),
    db.conexionActividadVersion.count({ where: { versionProyectoId } }),
    db.carrilVersion.count({ where: { versionProyectoId } }),
  ]);
  return historias + actividades + conexiones + carriles;
}
