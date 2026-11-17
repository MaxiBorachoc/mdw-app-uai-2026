/**
 * Acceso a datos de la documentación versionada: historias, actividades y flechas
 * (docs/spec.md, secciones 3 y 6). Las reglas viven en lib/documentacion.ts; acá
 * solo se lee y se escribe.
 *
 * Toda función recibe el proyectoId y filtra por él: quien llama ya verificó con
 * requerirAccesoAProyecto que el usuario de la sesión pertenece al proyecto.
 */
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  aplicarCambios,
  ultimaRevisionHasta,
  type Actividad,
  type Cambios,
  type Conexion,
  type ElementoConProblema,
  type Estado,
  type Historia,
  type TipoElemento,
} from "@/lib/documentacion";

type Cliente = Prisma.TransactionClient | typeof prisma;

// Tope de revisiones que se leen por tipo para reconstruir un build. Un proyecto de
// cursada no se acerca; si algún día se alcanza, hay que pasar a resolver la última
// revisión de cada elemento en la base (DISTINCT ON) en vez de en memoria.
const LIMITE_REVISIONES = 20_000;

// El orden del build solo sirve para elegir la revisión; no forma parte del estado.
function sinOrden<T extends { ordenBuild: number }>(revision: T): Omit<T, "ordenBuild"> {
  const { ordenBuild, ...resto } = revision;
  void ordenBuild;
  return resto;
}

const filtroBuild = (orden: number | null) =>
  orden === null ? {} : { versionProyecto: { orden: { lte: orden } } };

/**
 * La última revisión de cada elemento hasta el build `orden` (null: el build en
 * desarrollo), incluidas las que lo dan de baja. Para mostrar, pasar por vigentes().
 */
export async function cargarEstado(proyectoId: string, orden: number | null, db: Cliente = prisma): Promise<Estado> {
  const [historias, actividades, conexiones] = await Promise.all([
    db.historiaUsuarioVersion.findMany({
      where: { historia: { proyectoId }, ...filtroBuild(orden) },
      select: {
        historiaId: true,
        numeroVersion: true,
        eliminado: true,
        titulo: true,
        descripcion: true,
        criteriosAceptacion: true,
        versionProyecto: { select: { orden: true } },
      },
      take: LIMITE_REVISIONES,
    }),
    db.actividadVersion.findMany({
      where: { actividad: { proyectoId }, ...filtroBuild(orden) },
      select: {
        actividadId: true,
        numeroVersion: true,
        eliminado: true,
        nombre: true,
        documentacion: true,
        actividadPadreId: true,
        posicionX: true,
        posicionY: true,
        historias: { select: { historiaId: true } },
        versionProyecto: { select: { orden: true } },
      },
      take: LIMITE_REVISIONES,
    }),
    db.conexionActividadVersion.findMany({
      where: { conexion: { proyectoId }, ...filtroBuild(orden) },
      select: {
        conexionId: true,
        numeroVersion: true,
        eliminado: true,
        actividadOrigenId: true,
        actividadDestinoId: true,
        versionProyecto: { select: { orden: true } },
      },
      take: LIMITE_REVISIONES,
    }),
  ]);

  return {
    historias: ultimaRevisionHasta(
      historias.map((r) => ({
        id: r.historiaId,
        numeroVersion: r.numeroVersion,
        eliminado: r.eliminado,
        titulo: r.titulo,
        descripcion: r.descripcion,
        criteriosAceptacion: r.criteriosAceptacion,
        ordenBuild: r.versionProyecto.orden,
      })),
      orden,
    ).map((r): Historia => sinOrden(r)),
    actividades: ultimaRevisionHasta(
      actividades.map((r) => ({
        id: r.actividadId,
        numeroVersion: r.numeroVersion,
        eliminado: r.eliminado,
        nombre: r.nombre,
        documentacion: r.documentacion,
        padreId: r.actividadPadreId,
        posicionX: r.posicionX,
        posicionY: r.posicionY,
        historiaIds: r.historias.map((h) => h.historiaId),
        ordenBuild: r.versionProyecto.orden,
      })),
      orden,
    ).map((r): Actividad => sinOrden(r)),
    conexiones: ultimaRevisionHasta(
      conexiones.map((r) => ({
        id: r.conexionId,
        numeroVersion: r.numeroVersion,
        eliminado: r.eliminado,
        origenId: r.actividadOrigenId,
        destinoId: r.actividadDestinoId,
        ordenBuild: r.versionProyecto.orden,
      })),
      orden,
    ).map((r): Conexion => sinOrden(r)),
  };
}

/** Los builds del proyecto, del más nuevo al más viejo (el primero es el en desarrollo). */
export async function listarBuilds(proyectoId: string) {
  return prisma.versionProyecto.findMany({
    where: { proyectoId },
    orderBy: { orden: "desc" },
    take: 500,
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
    },
  });
}

/**
 * Bloquea el build en desarrollo del proyecto hasta el fin de la transacción
 * (spec, sección 6). Un UPDATE que no cambia nada toma el mismo bloqueo de fila
 * que un SELECT ... FOR UPDATE, pero pasa por Prisma: respeta el esquema
 * configurado en la conexión en vez de depender del search_path.
 */
export async function bloquearBuildEnDesarrollo(tx: Prisma.TransactionClient, proyectoId: string) {
  const condicion = { proyectoId, estado: "EN_DESARROLLO" as const };
  const bloqueadas = await tx.versionProyecto.updateMany({ where: condicion, data: { estado: "EN_DESARROLLO" } });
  if (bloqueadas.count === 0) return null;
  return tx.versionProyecto.findFirst({ where: condicion, select: { id: true, orden: true } });
}

export type ResultadoConfirmarCambios =
  | { ok: true; revisiones: number; ids: Record<string, string> }
  | { ok: false; motivo: "CONFLICTO" | "INVALIDO"; elementos: ElementoConProblema[] }
  | { ok: false; motivo: "SIN_BUILD" };

/**
 * H12: escribe los cambios de un borrador como revisiones del build en desarrollo,
 * en una sola transacción. Devuelve también la correspondencia entre los ids
 * temporales del borrador y los definitivos.
 */
export async function confirmarCambios(
  proyectoId: string,
  autorId: string,
  cambios: Cambios,
): Promise<ResultadoConfirmarCambios> {
  return prisma.$transaction(
    async (tx) => {
      const build = await bloquearBuildEnDesarrollo(tx, proyectoId);
      if (!build) return { ok: false, motivo: "SIN_BUILD" } as const;

      const actual = await cargarEstado(proyectoId, null, tx);
      const ids: Record<string, string> = {};
      const resultado = aplicarCambios(actual, cambios, (_tipo: TipoElemento, temporal) => {
        ids[temporal] = randomUUID();
        return ids[temporal];
      });
      if (!resultado.ok) return resultado;

      const comun = { versionProyectoId: build.id, autorId };
      const nuevos = (lista: { id: string; numeroVersion: number }[]) =>
        lista.filter((e) => e.numeroVersion === 1).map((e) => ({ id: e.id, proyectoId }));

      await tx.historiaUsuario.createMany({ data: nuevos(resultado.historias) });
      await tx.actividad.createMany({ data: nuevos(resultado.actividades) });
      await tx.conexionActividad.createMany({ data: nuevos(resultado.conexiones) });

      await tx.historiaUsuarioVersion.createMany({
        data: resultado.historias.map((h) => ({
          historiaId: h.id,
          numeroVersion: h.numeroVersion,
          eliminado: h.eliminado,
          titulo: h.titulo,
          descripcion: h.descripcion,
          criteriosAceptacion: h.criteriosAceptacion,
          ...comun,
        })),
      });

      const revisionesActividad = resultado.actividades.map((a) => ({ ...a, revisionId: randomUUID() }));
      await tx.actividadVersion.createMany({
        data: revisionesActividad.map((a) => ({
          id: a.revisionId,
          actividadId: a.id,
          numeroVersion: a.numeroVersion,
          eliminado: a.eliminado,
          nombre: a.nombre,
          documentacion: a.documentacion,
          actividadPadreId: a.padreId,
          posicionX: a.posicionX,
          posicionY: a.posicionY,
          ...comun,
        })),
      });
      await tx.actividadVersionHistoria.createMany({
        data: revisionesActividad.flatMap((a) =>
          a.historiaIds.map((historiaId) => ({ actividadVersionId: a.revisionId, historiaId })),
        ),
      });

      await tx.conexionActividadVersion.createMany({
        data: resultado.conexiones.map((c) => ({
          conexionId: c.id,
          numeroVersion: c.numeroVersion,
          eliminado: c.eliminado,
          actividadOrigenId: c.origenId,
          actividadDestinoId: c.destinoId,
          ...comun,
        })),
      });

      const revisiones = resultado.historias.length + resultado.actividades.length + resultado.conexiones.length;
      return { ok: true, revisiones, ids } as const;
    },
    { timeout: 20_000 },
  );
}

const etiquetaBuild = (b: { orden: number; estado: string; numeroVersion: number | null; numeroBuild: number | null; numeroPatch: number | null }) =>
  b.estado === "CERRADA" ? `${b.numeroVersion}.${b.numeroBuild}.${b.numeroPatch}` : "En desarrollo";

const LIMITE_HISTORIAL = 500;
const selectAutorYBuild = {
  numeroVersion: true,
  eliminado: true,
  creadoEn: true,
  autor: { select: { id: true, nombre: true } },
  versionProyecto: {
    select: { orden: true, estado: true, numeroVersion: true, numeroBuild: true, numeroPatch: true },
  },
} as const;

/** H4: el historial de revisiones de una historia, de la más nueva a la más vieja. */
export async function historialDeHistoria(proyectoId: string, historiaId: string) {
  const filas = await prisma.historiaUsuarioVersion.findMany({
    where: { historiaId, historia: { proyectoId } },
    orderBy: { numeroVersion: "desc" },
    take: LIMITE_HISTORIAL,
    select: { ...selectAutorYBuild, titulo: true, descripcion: true, criteriosAceptacion: true },
  });
  return filas.map(({ versionProyecto, ...r }) => ({ ...r, build: etiquetaBuild(versionProyecto) }));
}

/** H6: el historial de revisiones de una actividad, de la más nueva a la más vieja. */
export async function historialDeActividad(proyectoId: string, actividadId: string) {
  const filas = await prisma.actividadVersion.findMany({
    where: { actividadId, actividad: { proyectoId } },
    orderBy: { numeroVersion: "desc" },
    take: LIMITE_HISTORIAL,
    select: {
      ...selectAutorYBuild,
      nombre: true,
      documentacion: true,
      actividadPadreId: true,
      posicionX: true,
      posicionY: true,
      historias: { select: { historiaId: true } },
    },
  });
  return filas.map(({ versionProyecto, historias, ...r }) => ({
    ...r,
    historiaIds: historias.map((h) => h.historiaId),
    build: etiquetaBuild(versionProyecto),
  }));
}

export type CambioDeOtro = {
  tipo: TipoElemento;
  elementoId: string;
  numeroVersion: number;
  // Para una flecha: la actividad cuyo diagrama la contiene (spec, H12).
  actividadId: string | null;
  nombre: string;
  accion: "CREO" | "MODIFICO" | "ELIMINO";
  autor: { id: string; nombre: string };
  creadoEn: Date;
};

/**
 * H12: lo que otros usuarios confirmaron en el proyecto después de `desde`. Sirve
 * para avisar a quien tiene un borrador y para refrescar a quien no lo tiene.
 */
export async function cambiosDeOtrosDesde(proyectoId: string, usuarioId: string, desde: Date): Promise<CambioDeOtro[]> {
  const condicion = { creadoEn: { gt: desde }, autorId: { not: usuarioId } };
  const [historias, actividades, conexiones] = await Promise.all([
    prisma.historiaUsuarioVersion.findMany({
      where: { historia: { proyectoId }, ...condicion },
      orderBy: { creadoEn: "asc" },
      take: LIMITE_HISTORIAL,
      select: { historiaId: true, numeroVersion: true, eliminado: true, titulo: true, creadoEn: true, autor: { select: { id: true, nombre: true } } },
    }),
    prisma.actividadVersion.findMany({
      where: { actividad: { proyectoId }, ...condicion },
      orderBy: { creadoEn: "asc" },
      take: LIMITE_HISTORIAL,
      select: { actividadId: true, numeroVersion: true, eliminado: true, nombre: true, creadoEn: true, autor: { select: { id: true, nombre: true } } },
    }),
    prisma.conexionActividadVersion.findMany({
      where: { conexion: { proyectoId }, ...condicion },
      orderBy: { creadoEn: "asc" },
      take: LIMITE_HISTORIAL,
      select: { conexionId: true, numeroVersion: true, eliminado: true, actividadOrigenId: true, creadoEn: true, autor: { select: { id: true, nombre: true } } },
    }),
  ]);

  const accion = (r: { numeroVersion: number; eliminado: boolean }) =>
    r.eliminado ? ("ELIMINO" as const) : r.numeroVersion === 1 ? ("CREO" as const) : ("MODIFICO" as const);

  // Una flecha se informa con la actividad cuyo diagrama la contiene: el padre de su origen.
  let diagramas = new Map<string, { id: string; nombre: string }>();
  if (conexiones.length > 0) {
    const estado = await cargarEstado(proyectoId, null);
    const porId = new Map(estado.actividades.map((a) => [a.id, a]));
    diagramas = new Map(
      conexiones.map((c) => {
        const padreId = porId.get(c.actividadOrigenId)?.padreId ?? null;
        const padre = padreId ? porId.get(padreId) : undefined;
        return [c.conexionId, { id: padre?.id ?? c.actividadOrigenId, nombre: padre?.nombre ?? "Diagrama" }];
      }),
    );
  }

  return [
    ...historias.map((r) => ({
      tipo: "HISTORIA" as const,
      elementoId: r.historiaId,
      numeroVersion: r.numeroVersion,
      actividadId: null,
      nombre: r.titulo,
      accion: accion(r),
      autor: r.autor,
      creadoEn: r.creadoEn,
    })),
    ...actividades.map((r) => ({
      tipo: "ACTIVIDAD" as const,
      elementoId: r.actividadId,
      numeroVersion: r.numeroVersion,
      actividadId: r.actividadId,
      nombre: r.nombre,
      accion: accion(r),
      autor: r.autor,
      creadoEn: r.creadoEn,
    })),
    ...conexiones.map((r) => ({
      tipo: "CONEXION" as const,
      elementoId: r.conexionId,
      numeroVersion: r.numeroVersion,
      actividadId: diagramas.get(r.conexionId)?.id ?? null,
      nombre: diagramas.get(r.conexionId)?.nombre ?? "Diagrama",
      accion: "MODIFICO" as const,
      autor: r.autor,
      creadoEn: r.creadoEn,
    })),
  ].sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime());
}

/** La hora de la base: el punto de partida para consultar cambios de otros (H12). */
export async function ahoraEnLaBase(): Promise<Date> {
  const [fila] = await prisma.$queryRaw<{ ahora: Date }[]>`SELECT CURRENT_TIMESTAMP AS ahora`;
  return fila?.ahora ?? new Date();
}
