/**
 * H12: entradas de la confirmación de cambios y de la consulta de cambios de
 * otros usuarios (app/api/proyectos/[id]/cambios/route.ts).
 *
 * Un borrador manda, por cada elemento que tocó, el estado completo que quiere
 * para él y `base`: la versión del elemento sobre la que editó (null si lo creó en
 * el borrador, con un id temporal que empieza con "nuevo-"). El servidor la
 * compara con la vigente para detectar conflictos.
 */
import { z } from "zod";
import { actividadEnBorradorSchema } from "./actividad";
import { IdSchema } from "./comun";
import { conexionEnBorradorSchema } from "./conexionActividad";
import { contenidoHistoriaSchema } from "./historiaUsuario";

// Tope de elementos por confirmación: un borrador real queda muy lejos.
export const ELEMENTOS_POR_CONFIRMACION_MAX = 2000;

const control = {
  id: IdSchema.max(100),
  base: z.number().int().positive().nullable(),
  eliminado: z.boolean(),
};

export const cambiosSchema = z.object({
  historias: z.array(contenidoHistoriaSchema.extend(control)).max(ELEMENTOS_POR_CONFIRMACION_MAX),
  actividades: z.array(actividadEnBorradorSchema.extend(control)).max(ELEMENTOS_POR_CONFIRMACION_MAX),
  conexiones: z.array(conexionEnBorradorSchema.extend(control)).max(ELEMENTOS_POR_CONFIRMACION_MAX),
});
export type Cambios = z.infer<typeof cambiosSchema>;
export type CambioHistoria = Cambios["historias"][number];
export type CambioActividad = Cambios["actividades"][number];
export type CambioConexion = Cambios["conexiones"][number];

// GET .../cambios?desde=<fecha ISO>
export const consultaCambiosSchema = z.object({
  desde: z
    .string()
    .datetime({ offset: true, message: "desde tiene que ser una fecha ISO" })
    .transform((s) => new Date(s)),
});

// /proyectos/[id]?build=<n>: el orden de un build del proyecto.
export const ordenBuildSchema = z.coerce.number().int().positive();
