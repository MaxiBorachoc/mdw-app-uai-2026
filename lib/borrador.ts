/**
 * H12: el borrador del navegador. Las ediciones se acumulan en una copia de
 * trabajo del estado confirmado y recién se mandan al servidor al tocar
 * "Confirmar cambios". Por cada elemento modificado se manda una sola vez su
 * estado final (no un cambio por gesto), con la versión sobre la que se editó.
 *
 * Funciones puras: reciben un borrador y devuelven otro. Las consecuencias de
 * eliminar o de mover de padre usan las mismas reglas que el servidor
 * (lib/documentacion.ts), así lo que ve el usuario coincide con lo que se guarda.
 */
import {
  descendientes,
  PREFIJO_NUEVO,
  vigentes,
  type Actividad,
  type ActividadContenido,
  type Cambios,
  type Carril,
  type CarrilContenido,
  type Conexion,
  type Estado,
  type Historia,
  type HistoriaContenido,
  type TipoElemento,
} from "./documentacion";

export type Borrador = {
  // Lo confirmado al cargar la pantalla (solo elementos vigentes).
  confirmado: Estado;
  // La copia de trabajo: lo eliminado en el borrador queda marcado, no se quita.
  actual: Estado;
};

export function crearBorrador(confirmado: Estado): Borrador {
  return { confirmado, actual: confirmado };
}

export function idNuevo(): string {
  return `${PREFIJO_NUEVO}${crypto.randomUUID()}`;
}

/** Lo que se ve: la copia de trabajo sin lo eliminado ni lo que quedó colgando. */
export function vista(b: Borrador): Estado {
  return vigentes(b.actual);
}

const reemplazar = <T extends { id: string }>(lista: T[], id: string, cambio: (e: T) => T): T[] =>
  lista.map((e) => (e.id === id ? cambio(e) : e));

// --- Historias (H3, H4) ---------------------------------------------------------

export function crearHistoria(b: Borrador, id: string, contenido: HistoriaContenido): Borrador {
  const nueva: Historia = { ...contenido, id, numeroVersion: 0, eliminado: false };
  return { ...b, actual: { ...b.actual, historias: [...b.actual.historias, nueva] } };
}

export function editarHistoria(b: Borrador, id: string, contenido: HistoriaContenido): Borrador {
  return { ...b, actual: { ...b.actual, historias: reemplazar(b.actual.historias, id, (h) => ({ ...h, ...contenido })) } };
}

export function eliminarHistoria(b: Borrador, id: string): Borrador {
  return { ...b, actual: { ...b.actual, historias: reemplazar(b.actual.historias, id, (h) => ({ ...h, eliminado: true })) } };
}

// --- Actividades (H5, H6, H7) -----------------------------------------------------

export function crearActividad(
  b: Borrador,
  id: string,
  datos: Pick<ActividadContenido, "nombre" | "padreId" | "posicionX" | "posicionY"> & Partial<Pick<ActividadContenido, "tipo">>,
): Borrador {
  const nueva: Actividad = {
    id,
    numeroVersion: 0,
    eliminado: false,
    tipo: "ACTIVIDAD",
    documentacion: "",
    historiaIds: [],
    ...datos,
    posicionX: datos.padreId === null ? null : datos.posicionX,
    posicionY: datos.padreId === null ? null : datos.posicionY,
  };
  return { ...b, actual: { ...b.actual, actividades: [...b.actual.actividades, nueva] } };
}

export function editarActividad(
  b: Borrador,
  id: string,
  cambio: Partial<Pick<ActividadContenido, "nombre" | "documentacion" | "historiaIds" | "posicionX" | "posicionY">>,
): Borrador {
  return {
    ...b,
    actual: { ...b.actual, actividades: reemplazar(b.actual.actividades, id, (a) => ({ ...a, ...cambio })) },
  };
}

/** Flechas vigentes del borrador que tocan alguna de las actividades. */
function flechasQueTocan(b: Borrador, ids: Set<string>): string[] {
  return b.actual.conexiones
    .filter((c) => !c.eliminado && (ids.has(c.origenId) || ids.has(c.destinoId)))
    .map((c) => c.id);
}

/** H7: cuántas flechas se van a quitar si la actividad cambia de padre (para avisar). */
export function flechasDeActividad(b: Borrador, id: string): number {
  return flechasQueTocan(b, new Set([id])).length;
}

/** H7: mover una actividad a otro padre (o a ninguno). Sus flechas se eliminan. */
export function cambiarPadre(
  b: Borrador,
  id: string,
  padreId: string | null,
  posicion: { x: number; y: number },
): Borrador {
  const quitar = new Set(flechasQueTocan(b, new Set([id])));
  return {
    ...b,
    actual: {
      ...b.actual,
      actividades: reemplazar(b.actual.actividades, id, (a) => ({
        ...a,
        padreId,
        posicionX: padreId === null ? null : posicion.x,
        posicionY: padreId === null ? null : posicion.y,
      })),
      conexiones: b.actual.conexiones.map((c) => (quitar.has(c.id) ? { ...c, eliminado: true } : c)),
    },
  };
}

/** H6: qué se elimina junto con la actividad (para avisar antes de confirmar). */
export function alcanceDeEliminacion(b: Borrador, id: string): { actividades: number; flechas: number } {
  const ids = new Set([id, ...descendientes(b.actual.actividades, id)]);
  return { actividades: ids.size - 1, flechas: flechasQueTocan(b, ids).length };
}

/**
 * H6: eliminar una actividad elimina sus internas y las flechas que las tocan. H17:
 * también los carriles de su diagrama y de los de sus internas.
 */
export function eliminarActividad(b: Borrador, id: string): Borrador {
  const ids = new Set([id, ...descendientes(b.actual.actividades, id)]);
  const flechas = new Set(flechasQueTocan(b, ids));
  return {
    ...b,
    actual: {
      ...b.actual,
      actividades: b.actual.actividades.map((a) => (ids.has(a.id) ? { ...a, eliminado: true } : a)),
      conexiones: b.actual.conexiones.map((c) => (flechas.has(c.id) ? { ...c, eliminado: true } : c)),
      carriles: b.actual.carriles.map((c) => (ids.has(c.diagramaId) ? { ...c, eliminado: true } : c)),
    },
  };
}

// --- Flechas (H10) -----------------------------------------------------------------

/**
 * Crea una flecha. Si ya hay una vigente con el mismo origen y destino no se
 * duplica: devuelve el borrador sin cambios y el id de la existente, para
 * resaltarla.
 */
export function crearConexion(
  b: Borrador,
  id: string,
  origenId: string,
  destinoId: string,
): { borrador: Borrador; existente: string | null } {
  const existente = b.actual.conexiones.find((c) => !c.eliminado && c.origenId === origenId && c.destinoId === destinoId);
  if (existente) return { borrador: b, existente: existente.id };
  // Si se recrea una flecha eliminada en este mismo borrador, se la recupera.
  const eliminada = b.actual.conexiones.find((c) => c.eliminado && c.origenId === origenId && c.destinoId === destinoId);
  if (eliminada) {
    return {
      borrador: { ...b, actual: { ...b.actual, conexiones: reemplazar(b.actual.conexiones, eliminada.id, (c) => ({ ...c, eliminado: false })) } },
      existente: null,
    };
  }
  const nueva: Conexion = { id, numeroVersion: 0, eliminado: false, origenId, destinoId, guarda: "" };
  return { borrador: { ...b, actual: { ...b.actual, conexiones: [...b.actual.conexiones, nueva] } }, existente: null };
}

/** H16: la guarda de una flecha (condición opcional entre corchetes). */
export function editarGuarda(b: Borrador, id: string, guarda: string): Borrador {
  return { ...b, actual: { ...b.actual, conexiones: reemplazar(b.actual.conexiones, id, (c) => ({ ...c, guarda })) } };
}

export function eliminarConexion(b: Borrador, id: string): Borrador {
  return { ...b, actual: { ...b.actual, conexiones: reemplazar(b.actual.conexiones, id, (c) => ({ ...c, eliminado: true })) } };
}

// --- Carriles (H17) ----------------------------------------------------------------

export function crearCarril(b: Borrador, id: string, contenido: CarrilContenido): Borrador {
  const nuevo: Carril = { ...contenido, id, numeroVersion: 0, eliminado: false };
  return { ...b, actual: { ...b.actual, carriles: [...b.actual.carriles, nuevo] } };
}

/** El nombre, la posición o el ancho. El diagrama de un carril no cambia. */
export function editarCarril(b: Borrador, id: string, cambio: Partial<Pick<CarrilContenido, "nombre" | "posicionX" | "ancho">>): Borrador {
  return { ...b, actual: { ...b.actual, carriles: reemplazar(b.actual.carriles, id, (c) => ({ ...c, ...cambio })) } };
}

/** Eliminar un carril no toca ningún nodo: no hay relación guardada entre ellos. */
export function eliminarCarril(b: Borrador, id: string): Borrador {
  return { ...b, actual: { ...b.actual, carriles: reemplazar(b.actual.carriles, id, (c) => ({ ...c, eliminado: true })) } };
}

// --- Qué se confirma ---------------------------------------------------------------

const mismos = (a: string[], b: string[]) => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

function cambioHistoria(a: Historia, b: Historia | undefined) {
  return (
    !b ||
    a.eliminado !== b.eliminado ||
    a.titulo !== b.titulo ||
    a.descripcion !== b.descripcion ||
    a.criteriosAceptacion.length !== b.criteriosAceptacion.length ||
    a.criteriosAceptacion.some((c, i) => c !== b.criteriosAceptacion[i])
  );
}

function cambioActividad(a: Actividad, b: Actividad | undefined) {
  return (
    !b ||
    a.eliminado !== b.eliminado ||
    a.tipo !== b.tipo ||
    a.nombre !== b.nombre ||
    a.documentacion !== b.documentacion ||
    a.padreId !== b.padreId ||
    a.posicionX !== b.posicionX ||
    a.posicionY !== b.posicionY ||
    !mismos(a.historiaIds, b.historiaIds)
  );
}

function cambioConexion(a: Conexion, b: Conexion | undefined) {
  return !b || a.eliminado !== b.eliminado || a.origenId !== b.origenId || a.destinoId !== b.destinoId || a.guarda !== b.guarda;
}

function cambioCarril(a: Carril, b: Carril | undefined) {
  return (
    !b ||
    a.eliminado !== b.eliminado ||
    a.diagramaId !== b.diagramaId ||
    a.nombre !== b.nombre ||
    a.posicionX !== b.posicionX ||
    a.ancho !== b.ancho
  );
}

/** Lo que se manda al confirmar: el estado final de cada elemento modificado. */
export function cambiosParaConfirmar(b: Borrador): Cambios {
  const previa = <T extends { id: string }>(lista: T[], id: string) => lista.find((e) => e.id === id);
  const base = (e: { id: string }, lista: { id: string; numeroVersion: number }[]) => previa(lista, e.id)?.numeroVersion ?? null;
  // Lo creado y eliminado dentro del mismo borrador nunca existió para el servidor.
  const relevante = (e: { id: string; eliminado: boolean }) => !(e.id.startsWith(PREFIJO_NUEVO) && e.eliminado);

  return {
    historias: b.actual.historias
      .filter((h) => relevante(h) && cambioHistoria(h, previa(b.confirmado.historias, h.id)))
      .map((h) => ({
        id: h.id,
        base: base(h, b.confirmado.historias),
        eliminado: h.eliminado,
        titulo: h.titulo,
        descripcion: h.descripcion,
        criteriosAceptacion: h.criteriosAceptacion,
      })),
    actividades: b.actual.actividades
      .filter((a) => relevante(a) && cambioActividad(a, previa(b.confirmado.actividades, a.id)))
      .map((a) => ({
        id: a.id,
        base: base(a, b.confirmado.actividades),
        eliminado: a.eliminado,
        tipo: a.tipo,
        nombre: a.nombre,
        documentacion: a.documentacion,
        padreId: a.padreId,
        posicionX: a.posicionX,
        posicionY: a.posicionY,
        historiaIds: a.historiaIds,
      })),
    conexiones: b.actual.conexiones
      .filter((c) => relevante(c) && cambioConexion(c, previa(b.confirmado.conexiones, c.id)))
      .map((c) => ({
        id: c.id,
        base: base(c, b.confirmado.conexiones),
        eliminado: c.eliminado,
        origenId: c.origenId,
        destinoId: c.destinoId,
        guarda: c.guarda,
      })),
    carriles: b.actual.carriles
      .filter((c) => relevante(c) && cambioCarril(c, previa(b.confirmado.carriles, c.id)))
      .map((c) => ({
        id: c.id,
        base: base(c, b.confirmado.carriles),
        eliminado: c.eliminado,
        diagramaId: c.diagramaId,
        nombre: c.nombre,
        posicionX: c.posicionX,
        ancho: c.ancho,
      })),
  };
}

export function hayCambios(b: Borrador): boolean {
  const c = cambiosParaConfirmar(b);
  return c.historias.length + c.actividades.length + c.conexiones.length + c.carriles.length > 0;
}

/** Ids de los elementos ya confirmados que el borrador modifica (para detectar choques, H12). */
export function elementosModificados(b: Borrador): Map<string, TipoElemento> {
  const c = cambiosParaConfirmar(b);
  const resultado = new Map<string, TipoElemento>();
  for (const h of c.historias) if (h.base !== null) resultado.set(h.id, "HISTORIA");
  for (const a of c.actividades) if (a.base !== null) resultado.set(a.id, "ACTIVIDAD");
  for (const x of c.conexiones) if (x.base !== null) resultado.set(x.id, "CONEXION");
  for (const x of c.carriles) if (x.base !== null) resultado.set(x.id, "CARRIL");
  return resultado;
}

/**
 * H12: trae lo que confirmaron otros sin perder el borrador. Reaplica los cambios
 * del usuario sobre el estado nuevo; descarta los de elementos que otro modificó
 * o eliminó mientras tanto (no hay fusión automática) y devuelve cuáles fueron.
 */
export function rebasar(b: Borrador, nuevo: Estado): { borrador: Borrador; descartados: string[] } {
  const cambios = cambiosParaConfirmar(b);
  const descartados: string[] = [];

  const aplicar = <T extends { id: string; numeroVersion: number }, C extends { id: string; base: number | null }>(
    vigentesNuevos: T[],
    lista: C[],
    armar: (cambio: C, numeroVersion: number) => T,
  ): T[] => {
    const resultado = [...vigentesNuevos];
    for (const cambio of lista) {
      const i = resultado.findIndex((e) => e.id === cambio.id);
      const vigente = i >= 0 ? resultado[i] : undefined;
      if (cambio.base !== null && vigente?.numeroVersion !== cambio.base) {
        descartados.push(cambio.id);
        continue;
      }
      const elemento = armar(cambio, vigente?.numeroVersion ?? 0);
      if (i >= 0) resultado[i] = elemento;
      else resultado.push(elemento);
    }
    return resultado;
  };

  const actual: Estado = {
    historias: aplicar(nuevo.historias, cambios.historias, (c, numeroVersion) => ({ ...c, numeroVersion })),
    actividades: aplicar(nuevo.actividades, cambios.actividades, (c, numeroVersion) => ({ ...c, numeroVersion })),
    conexiones: aplicar(nuevo.conexiones, cambios.conexiones, (c, numeroVersion) => ({ ...c, numeroVersion })),
    carriles: aplicar(nuevo.carriles, cambios.carriles, (c, numeroVersion) => ({ ...c, numeroVersion })),
  };
  return { borrador: { confirmado: nuevo, actual }, descartados };
}
