/**
 * Reglas de la documentación versionada (docs/spec.md, secciones 3 y 6):
 * historias de usuario, actividades (un diagrama es una actividad sin padre) y
 * flechas entre actividades.
 *
 * Funciones puras: sin Prisma, sin Next y sin leer el reloj. Las usan el servidor
 * (lib/db/documentacion.ts, al reconstruir un build y al confirmar cambios) y el
 * borrador del navegador (lib/borrador.ts), así las dos puntas aplican las mismas
 * reglas.
 */

import type { ActividadContenido } from "@/lib/schemas/actividad";
import type { Cambios } from "@/lib/schemas/cambios";
import type { ConexionContenido } from "@/lib/schemas/conexionActividad";
import type { HistoriaContenido } from "@/lib/schemas/historiaUsuario";

export type { ActividadContenido, Cambios, ConexionContenido, HistoriaContenido };

type Elemento<C> = C & { id: string; numeroVersion: number; eliminado: boolean };

export type Historia = Elemento<HistoriaContenido>;
export type Actividad = Elemento<ActividadContenido>;
export type Conexion = Elemento<ConexionContenido>;

/** La última revisión de cada elemento, incluidas las que lo dan de baja. */
export type Estado = {
  historias: Historia[];
  actividades: Actividad[];
  conexiones: Conexion[];
};

export type TipoElemento = "HISTORIA" | "ACTIVIDAD" | "CONEXION";

// ---------------------------------------------------------------------------
// Reconstrucción de un build
// ---------------------------------------------------------------------------

/**
 * De cada elemento, la última revisión confirmada en el build `orden` o en uno
 * anterior. Con `orden` null (el build en desarrollo) toma la última de todas.
 */
export function ultimaRevisionHasta<T extends { id: string; numeroVersion: number; ordenBuild: number }>(
  revisiones: T[],
  orden: number | null,
): T[] {
  const ultimas = new Map<string, T>();
  for (const r of revisiones) {
    if (orden !== null && r.ordenBuild > orden) continue;
    const previa = ultimas.get(r.id);
    if (!previa || r.numeroVersion > previa.numeroVersion) ultimas.set(r.id, r);
  }
  return [...ultimas.values()];
}

/**
 * Lo que se muestra de un estado: sin los elementos eliminados ni lo que quedó
 * colgando de ellos (una actividad cuyo padre no está vigente, una flecha cuyo
 * extremo no está vigente o que ya no une actividades del mismo diagrama, una
 * asociación a una historia eliminada).
 */
export function vigentes(estado: Estado): Estado {
  const historias = estado.historias.filter((h) => !h.eliminado);
  const idsHistorias = new Set(historias.map((h) => h.id));

  const porId = new Map(estado.actividades.map((a) => [a.id, a]));
  const visible = new Map<string, boolean>();
  const esVisible = (id: string, camino: Set<string>): boolean => {
    const cache = visible.get(id);
    if (cache !== undefined) return cache;
    const a = porId.get(id);
    let ok = !!a && !a.eliminado && !camino.has(id);
    if (ok && a!.padreId !== null) {
      camino.add(id);
      ok = esVisible(a!.padreId, camino);
      camino.delete(id);
    }
    visible.set(id, ok);
    return ok;
  };
  const actividades = estado.actividades
    .filter((a) => esVisible(a.id, new Set()))
    .map((a) => ({ ...a, historiaIds: a.historiaIds.filter((id) => idsHistorias.has(id)) }));
  const actividadesVigentes = new Map(actividades.map((a) => [a.id, a]));

  const conexiones = estado.conexiones.filter((c) => {
    if (c.eliminado) return false;
    const origen = actividadesVigentes.get(c.origenId);
    const destino = actividadesVigentes.get(c.destinoId);
    return !!origen && !!destino && origen.padreId !== null && origen.padreId === destino.padreId;
  });

  return { historias, actividades, conexiones };
}

// ---------------------------------------------------------------------------
// Jerarquía de actividades
// ---------------------------------------------------------------------------

/** Ids de todas las actividades internas de `id`, en todos los niveles (sin incluirla). */
export function descendientes(actividades: Pick<Actividad, "id" | "padreId" | "eliminado">[], id: string): string[] {
  const hijas = new Map<string, string[]>();
  for (const a of actividades) {
    if (a.eliminado || a.padreId === null) continue;
    hijas.set(a.padreId, [...(hijas.get(a.padreId) ?? []), a.id]);
  }
  const resultado: string[] = [];
  const pendientes = [...(hijas.get(id) ?? [])];
  const vistos = new Set<string>([id]);
  while (pendientes.length > 0) {
    const actual = pendientes.pop()!;
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    resultado.push(actual);
    pendientes.push(...(hijas.get(actual) ?? []));
  }
  return resultado;
}

/** Ancestros de `id`, del padre hacia el diagrama raíz. Se corta si encuentra un ciclo. */
export function ancestros(actividades: Pick<Actividad, "id" | "padreId">[], id: string): string[] {
  const porId = new Map(actividades.map((a) => [a.id, a]));
  const resultado: string[] = [];
  let actual = porId.get(id)?.padreId ?? null;
  while (actual !== null && !resultado.includes(actual) && actual !== id) {
    resultado.push(actual);
    actual = porId.get(actual)?.padreId ?? null;
  }
  return resultado;
}

/** H7: se puede mover `id` bajo `nuevoPadreId` salvo que sea ella misma o una interna suya. */
export function puedeMoverA(
  actividades: Pick<Actividad, "id" | "padreId" | "eliminado">[],
  id: string,
  nuevoPadreId: string | null,
): boolean {
  if (nuevoPadreId === null) return true;
  if (nuevoPadreId === id) return false;
  return !descendientes(actividades, id).includes(nuevoPadreId);
}

/** Flechas vigentes que tocan alguna de las actividades indicadas. */
export function conexionesQueTocan(conexiones: Conexion[], actividadIds: Set<string>): Conexion[] {
  return conexiones.filter(
    (c) => !c.eliminado && (actividadIds.has(c.origenId) || actividadIds.has(c.destinoId)),
  );
}

// ---------------------------------------------------------------------------
// Títulos de historias
// ---------------------------------------------------------------------------

/**
 * H3: el título se compara sin distinguir mayúsculas/minúsculas ni espacios al
 * borde, pero sí acentos y espacios internos.
 */
export function normalizarTitulo(titulo: string): string {
  return titulo.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Confirmar cambios (H12)
// ---------------------------------------------------------------------------

// Un cambio del borrador (ver lib/schemas/cambios.ts): el estado completo que el
// usuario quiere para el elemento y la versión sobre la que editó. Un elemento
// creado en el borrador lleva un id temporal que empieza con PREFIJO_NUEVO.
export const PREFIJO_NUEVO = "nuevo-";

export type ElementoConProblema = { tipo: TipoElemento; id: string; nombre: string; motivo: string };

export type ResultadoConfirmacion =
  | {
      ok: true;
      // Las revisiones a escribir, con su nueva versión del elemento. Los ids
      // nuevos ya están reemplazados por los definitivos.
      historias: Historia[];
      actividades: Actividad[];
      conexiones: Conexion[];
    }
  | { ok: false; motivo: "CONFLICTO"; elementos: ElementoConProblema[] }
  | { ok: false; motivo: "INVALIDO"; elementos: ElementoConProblema[] };

function igualesHistoria(a: HistoriaContenido & { eliminado: boolean }, b: HistoriaContenido & { eliminado: boolean }) {
  return (
    a.eliminado === b.eliminado &&
    a.titulo === b.titulo &&
    a.descripcion === b.descripcion &&
    a.criteriosAceptacion.length === b.criteriosAceptacion.length &&
    a.criteriosAceptacion.every((c, i) => c === b.criteriosAceptacion[i])
  );
}

function igualesActividad(a: ActividadContenido & { eliminado: boolean }, b: ActividadContenido & { eliminado: boolean }) {
  const ha = [...a.historiaIds].sort();
  const hb = [...b.historiaIds].sort();
  return (
    a.eliminado === b.eliminado &&
    a.nombre === b.nombre &&
    a.documentacion === b.documentacion &&
    a.padreId === b.padreId &&
    a.posicionX === b.posicionX &&
    a.posicionY === b.posicionY &&
    ha.length === hb.length &&
    ha.every((id, i) => id === hb[i])
  );
}

function igualesConexion(a: ConexionContenido & { eliminado: boolean }, b: ConexionContenido & { eliminado: boolean }) {
  return a.eliminado === b.eliminado && a.origenId === b.origenId && a.destinoId === b.destinoId;
}

const nombreDe = {
  historia: (h: { titulo: string }) => h.titulo,
  actividad: (a: { nombre: string }) => a.nombre,
};

/**
 * Aplica los cambios de un borrador sobre el estado actual (la última revisión de
 * cada elemento) y devuelve las revisiones a escribir, o por qué no se puede.
 *
 * - CONFLICTO: alguien confirmó una revisión más nueva de un elemento del borrador,
 *   o el borrador referencia algo que ya no existe. Se rechaza todo (sin fusión).
 * - INVALIDO: el resultado rompería una regla de negocio (título repetido, ciclo de
 *   contención, flecha entre diagramas distintos o duplicada...).
 *
 * Además de lo que pidió el usuario, aplica las consecuencias que la regla exige
 * en el mismo cambio: eliminar una actividad elimina sus internas y las flechas
 * que tocan a cualquiera de ellas, y mover una actividad de padre elimina sus
 * flechas. Un cambio que deja el elemento igual que su revisión vigente no genera
 * revisión.
 *
 * `nuevoId` da el id definitivo para cada elemento creado en el borrador.
 */
export function aplicarCambios(
  actual: Estado,
  cambios: Cambios,
  nuevoId: (tipo: TipoElemento, idTemporal: string) => string,
): ResultadoConfirmacion {
  const conflictos: ElementoConProblema[] = [];
  const invalidos: ElementoConProblema[] = [];

  const historiasActuales = new Map(actual.historias.map((h) => [h.id, h]));
  const actividadesActuales = new Map(actual.actividades.map((a) => [a.id, a]));
  const conexionesActuales = new Map(actual.conexiones.map((c) => [c.id, c]));

  // 1. Ids definitivos para lo creado en el borrador, y control de versión base.
  const ids = new Map<string, string>();
  const resolver = (id: string) => ids.get(id) ?? id;
  const revisar = <T extends { numeroVersion: number }>(
    tipo: TipoElemento,
    cambio: { id: string; base: number | null },
    actuales: Map<string, T>,
    nombre: string,
  ) => {
    if (cambio.base === null) {
      if (!cambio.id.startsWith(PREFIJO_NUEVO) || actuales.has(cambio.id)) {
        invalidos.push({ tipo, id: cambio.id, nombre, motivo: "Un elemento nuevo necesita un id temporal" });
      } else {
        ids.set(cambio.id, nuevoId(tipo, cambio.id));
      }
      return;
    }
    const vigente = actuales.get(cambio.id);
    if (!vigente) {
      invalidos.push({ tipo, id: cambio.id, nombre, motivo: "El elemento no pertenece al proyecto" });
    } else if (vigente.numeroVersion !== cambio.base) {
      conflictos.push({ tipo, id: cambio.id, nombre, motivo: "Otro usuario ya confirmó cambios sobre este elemento" });
    }
  };
  for (const h of cambios.historias) revisar("HISTORIA", h, historiasActuales, nombreDe.historia(h));
  for (const a of cambios.actividades) revisar("ACTIVIDAD", a, actividadesActuales, nombreDe.actividad(a));
  for (const c of cambios.conexiones) revisar("CONEXION", c, conexionesActuales, "Flecha");
  if (conflictos.length > 0) return { ok: false, motivo: "CONFLICTO", elementos: conflictos };
  if (invalidos.length > 0) return { ok: false, motivo: "INVALIDO", elementos: invalidos };

  // 2. Estado resultante: lo actual con los cambios encima.
  const historias = new Map(historiasActuales);
  const actividades = new Map(actividadesActuales);
  const conexiones = new Map(conexionesActuales);
  const tocadas = { historias: new Set<string>(), actividades: new Set<string>(), conexiones: new Set<string>() };

  for (const h of cambios.historias) {
    const id = resolver(h.id);
    historias.set(id, { ...h, id, numeroVersion: historiasActuales.get(id)?.numeroVersion ?? 0 });
    tocadas.historias.add(id);
  }
  for (const a of cambios.actividades) {
    const id = resolver(a.id);
    const previa = actividadesActuales.get(id);
    const nueva: Actividad = {
      ...a,
      id,
      numeroVersion: previa?.numeroVersion ?? 0,
      padreId: a.padreId === null ? null : resolver(a.padreId),
      historiaIds: [...new Set(a.historiaIds.map(resolver))],
    };
    // Una asociación que ya estaba y cuya historia quedó eliminada se descarta en
    // silencio (la historia eliminada deja de mostrarse, ver spec sección 6); una
    // asociación nueva a algo que no está vigente es un conflicto.
    nueva.historiaIds = nueva.historiaIds.filter((hid) => {
      const historia = historias.get(hid);
      if (historia && !historia.eliminado) return true;
      if (previa?.historiaIds.includes(hid)) return false;
      conflictos.push({
        tipo: "ACTIVIDAD",
        id: a.id,
        nombre: a.nombre,
        motivo: "Se asoció a una historia que ya no existe",
      });
      return false;
    });
    actividades.set(id, nueva);
    tocadas.actividades.add(id);
  }
  for (const c of cambios.conexiones) {
    const id = resolver(c.id);
    conexiones.set(id, {
      ...c,
      id,
      numeroVersion: conexionesActuales.get(id)?.numeroVersion ?? 0,
      origenId: resolver(c.origenId),
      destinoId: resolver(c.destinoId),
    });
    tocadas.conexiones.add(id);
  }

  // 3. Consecuencias en el mismo cambio: eliminación en cascada y flechas de una
  // actividad que cambió de padre.
  const listaActividades = () => [...actividades.values()];
  for (const id of [...tocadas.actividades]) {
    const a = actividades.get(id)!;
    const previa = actividadesActuales.get(id);
    const afectadas = new Set<string>();
    if (a.eliminado && !previa?.eliminado) {
      const internas = descendientes(
        listaActividades().map((x) => (x.id === id ? { ...x, eliminado: false } : x)),
        id,
      );
      for (const interna of internas) {
        const actividad = actividades.get(interna)!;
        if (!actividad.eliminado) {
          actividades.set(interna, { ...actividad, eliminado: true });
          tocadas.actividades.add(interna);
        }
        afectadas.add(interna);
      }
      afectadas.add(id);
    } else if (previa && a.padreId !== previa.padreId) {
      afectadas.add(id);
    }
    for (const c of conexionesQueTocan([...conexiones.values()], afectadas)) {
      conexiones.set(c.id, { ...c, eliminado: true });
      tocadas.conexiones.add(c.id);
    }
  }

  // 4. Reglas sobre el estado resultante.
  const historiasVigentes = [...historias.values()].filter((h) => !h.eliminado);
  const titulos = new Map<string, string>();
  for (const h of historiasVigentes) {
    const clave = normalizarTitulo(h.titulo);
    const otra = titulos.get(clave);
    if (otra && (tocadas.historias.has(h.id) || tocadas.historias.has(otra))) {
      const culpable = tocadas.historias.has(h.id) ? h : historias.get(otra)!;
      invalidos.push({
        tipo: "HISTORIA",
        id: culpable.id,
        nombre: culpable.titulo,
        motivo: "Ya existe otra historia con ese título en el proyecto",
      });
    }
    titulos.set(clave, h.id);
  }

  const actividadesVigentes = listaActividades();
  for (const id of tocadas.actividades) {
    const a = actividades.get(id)!;
    if (a.eliminado) continue;
    if (a.padreId !== null) {
      const padre = actividades.get(a.padreId);
      if (!padre || padre.eliminado) {
        conflictos.push({ tipo: "ACTIVIDAD", id, nombre: a.nombre, motivo: "La actividad padre ya no existe" });
        continue;
      }
      if (!puedeMoverA(actividadesVigentes, id, a.padreId) || ancestros(actividadesVigentes, id).includes(id)) {
        invalidos.push({
          tipo: "ACTIVIDAD",
          id,
          nombre: a.nombre,
          motivo: "No se puede mover una actividad a sí misma ni a una de sus actividades internas",
        });
      }
      if (a.posicionX === null || a.posicionY === null) {
        invalidos.push({ tipo: "ACTIVIDAD", id, nombre: a.nombre, motivo: "Falta la posición en el lienzo" });
      }
    } else if (a.posicionX !== null || a.posicionY !== null) {
      // Un diagrama no se dibuja en ningún lienzo: su posición queda vacía.
      actividades.set(id, { ...a, posicionX: null, posicionY: null });
    }
  }

  const flechasVigentes = new Map<string, string[]>();
  for (const c of conexiones.values()) {
    if (c.eliminado) continue;
    const clave = `${c.origenId}→${c.destinoId}`;
    flechasVigentes.set(clave, [...(flechasVigentes.get(clave) ?? []), c.id]);
  }
  for (const id of tocadas.conexiones) {
    const c = conexiones.get(id)!;
    if (c.eliminado) continue;
    const origen = actividades.get(c.origenId);
    const destino = actividades.get(c.destinoId);
    if (!origen || !destino || origen.eliminado || destino.eliminado) {
      conflictos.push({ tipo: "CONEXION", id, nombre: "Flecha", motivo: "Una de las actividades que une ya no existe" });
      continue;
    }
    if (origen.padreId === null || destino.padreId === null) {
      invalidos.push({ tipo: "CONEXION", id, nombre: "Flecha", motivo: "Los diagramas no se conectan con flechas" });
    } else if (origen.padreId !== destino.padreId) {
      invalidos.push({
        tipo: "CONEXION",
        id,
        nombre: "Flecha",
        motivo: "Una flecha solo une actividades del mismo diagrama",
      });
    }
    if ((flechasVigentes.get(`${c.origenId}→${c.destinoId}`) ?? []).length > 1) {
      invalidos.push({ tipo: "CONEXION", id, nombre: "Flecha", motivo: "Ya existe una flecha con ese origen y destino" });
    }
  }

  if (conflictos.length > 0) return { ok: false, motivo: "CONFLICTO", elementos: conflictos };
  if (invalidos.length > 0) return { ok: false, motivo: "INVALIDO", elementos: invalidos };

  // 5. Solo lo que realmente cambió genera una revisión nueva.
  const historiasNuevas: Historia[] = [];
  for (const id of tocadas.historias) {
    const h = historias.get(id)!;
    const previa = historiasActuales.get(id);
    if (previa ? igualesHistoria(previa, h) : h.eliminado) continue;
    historiasNuevas.push({ ...h, numeroVersion: (previa?.numeroVersion ?? 0) + 1 });
  }
  const actividadesNuevas: Actividad[] = [];
  for (const id of tocadas.actividades) {
    const a = actividades.get(id)!;
    const previa = actividadesActuales.get(id);
    if (previa ? igualesActividad(previa, a) : a.eliminado) continue;
    actividadesNuevas.push({ ...a, numeroVersion: (previa?.numeroVersion ?? 0) + 1 });
  }
  const conexionesNuevas: Conexion[] = [];
  for (const id of tocadas.conexiones) {
    const c = conexiones.get(id)!;
    const previa = conexionesActuales.get(id);
    if (previa ? igualesConexion(previa, c) : c.eliminado) continue;
    conexionesNuevas.push({ ...c, numeroVersion: (previa?.numeroVersion ?? 0) + 1 });
  }

  // Un elemento creado en el borrador que no llega a escribirse (por ejemplo, una
  // actividad nueva eliminada antes de confirmar) no puede quedar referenciado.
  const escritas = new Set(actividadesNuevas.map((a) => a.id));
  for (const a of actividadesNuevas) {
    if (a.padreId !== null && !actividadesActuales.has(a.padreId) && !escritas.has(a.padreId)) {
      return {
        ok: false,
        motivo: "INVALIDO",
        elementos: [{ tipo: "ACTIVIDAD", id: a.id, nombre: a.nombre, motivo: "La actividad padre no existe" }],
      };
    }
  }

  return { ok: true, historias: historiasNuevas, actividades: actividadesNuevas, conexiones: conexionesNuevas };
}
