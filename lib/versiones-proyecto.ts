/**
 * Reglas de negocio de H8 (cerrar una version de proyecto).
 *
 * Funciones puras: sin Prisma, sin Next y sin leer el reloj. Reciben los datos
 * que alguien ya fue a buscar y devuelven un veredicto (ver docs/spec.md, H8).
 */

export type NumeroVersion = {
  numeroVersion: number;
  numeroBuild: number;
  numeroPatch: number;
};

export type VeredictoCierre =
  | { ok: true }
  | { ok: false; motivo: "SIN_CAMBIOS" }
  | { ok: false; motivo: "DUPLICADA"; version: NumeroVersion }
  | { ok: false; motivo: "NO_ASCENDENTE"; ultimaCerrada: NumeroVersion };

// Orden Version, luego Build, luego Patch. Negativo si a < b, 0 si son iguales.
export function compararVersiones(a: NumeroVersion, b: NumeroVersion): number {
  return (
    a.numeroVersion - b.numeroVersion ||
    a.numeroBuild - b.numeroBuild ||
    a.numeroPatch - b.numeroPatch
  );
}

// H8: la combinacion no puede repetirse entre las cerradas del proyecto, y tiene
// que quedar por encima de la ultima cerrada (se pueden saltear numeros).
export function validarCierreDeVersion(
  nueva: NumeroVersion,
  cerradas: NumeroVersion[],
  tieneCambios: boolean = true,
): VeredictoCierre {
  if (!tieneCambios) {
    return { ok: false, motivo: "SIN_CAMBIOS" };
  }
  const repetida = cerradas.find((c) => compararVersiones(c, nueva) === 0);
  if (repetida) {
    return { ok: false, motivo: "DUPLICADA", version: repetida };
  }

  const ultimaCerrada = cerradas.reduce<NumeroVersion | null>(
    (mayor, actual) => (mayor === null || compararVersiones(actual, mayor) > 0 ? actual : mayor),
    null,
  );

  if (ultimaCerrada && compararVersiones(nueva, ultimaCerrada) < 0) {
    return { ok: false, motivo: "NO_ASCENDENTE", ultimaCerrada };
  }

  return { ok: true };
}

export function formatearVersion(v: NumeroVersion): string {
  return `${v.numeroVersion}.${v.numeroBuild}.${v.numeroPatch}`;
}

/**
 * H15: qué hace "Finalizar proyecto" según el build en desarrollo (docs/spec.md
 * secciones 4 y 6).
 * - Con cambios confirmados: hay que cerrarlo (número y entregable) y no abrir
 *   otro. Si no vinieron los datos del cierre, se piden.
 * - Sin cambios: se descarta y el proyecto queda en su última versión cerrada,
 *   salvo que no haya ninguna: entonces no hay nada que finalizar.
 */
export type DecisionFinalizacion =
  | { accion: "CERRAR_Y_FINALIZAR" }
  | { accion: "DESCARTAR_Y_FINALIZAR" }
  | { accion: "RECHAZAR"; motivo: "CIERRE_REQUERIDO" | "NADA_QUE_FINALIZAR" };

export function decidirFinalizacion(situacion: {
  tieneCambios: boolean;
  hayVersionesCerradas: boolean;
  vinoElCierre: boolean;
}): DecisionFinalizacion {
  if (situacion.tieneCambios) {
    return situacion.vinoElCierre ? { accion: "CERRAR_Y_FINALIZAR" } : { accion: "RECHAZAR", motivo: "CIERRE_REQUERIDO" };
  }
  return situacion.hayVersionesCerradas
    ? { accion: "DESCARTAR_Y_FINALIZAR" }
    : { accion: "RECHAZAR", motivo: "NADA_QUE_FINALIZAR" };
}
