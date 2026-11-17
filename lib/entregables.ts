/**
 * H14: el estado de un entregable, calculado a partir de sus fechas (docs/spec.md
 * seccion 6). No se guarda en la base: cambia solo con el paso de los dias.
 *
 * Las fechas son texto "AAAA-MM-DD": compararlas como texto respeta el orden
 * cronologico. "hoy" es la fecha de Argentina (lib/utils.ts, hoyEnArgentina).
 */
import type { EstadoEntregable } from "./schemas/entregable";

export type { EstadoEntregable };

export function estadoEntregable(
  entregable: { fechaEstimada: string; entregado: boolean; fechaEntrega: string | null },
  hoy: string,
): EstadoEntregable {
  if (entregable.entregado && entregable.fechaEntrega) {
    return entregable.fechaEntrega <= entregable.fechaEstimada ? "ENTREGADO_A_TIEMPO" : "ENTREGADO_CON_ATRASO";
  }
  // El dia de la fecha estimada todavia cuenta como pendiente.
  return hoy > entregable.fechaEstimada ? "ATRASADO" : "PENDIENTE";
}

export const etiquetaEstadoEntregable: Record<EstadoEntregable, string> = {
  PENDIENTE: "Pendiente",
  ATRASADO: "Atrasado",
  ENTREGADO_A_TIEMPO: "Entregado a tiempo",
  ENTREGADO_CON_ATRASO: "Entregado con atraso",
};
