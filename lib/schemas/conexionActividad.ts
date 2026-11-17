/**
 * Flechas entre actividades (H10). ConexionActividad es la identidad (solo id y
 * proyecto); ConexionActividadVersion es cada revisión inmutable, con origen,
 * destino y los campos comunes a todo elemento versionable (docs/spec.md,
 * sección 3).
 *
 * Que una flecha una actividades del mismo diagrama y no esté duplicada depende de
 * las demás actividades y flechas, así que no se valida acá sino en
 * lib/documentacion.ts. Una flecha de una actividad hacia sí misma es válida.
 */
import { z } from "zod";
import { IdSchema } from "./comun";

export const conexionEnBorradorSchema = z.object({
  origenId: IdSchema,
  destinoId: IdSchema,
});
export type ConexionContenido = z.infer<typeof conexionEnBorradorSchema>;

export const ConexionActividadSchema = z.object({
  id: IdSchema,
  proyectoId: IdSchema,
});
export type ConexionActividad = z.infer<typeof ConexionActividadSchema>;

export const ConexionActividadVersionSchema = z.object({
  id: IdSchema,
  conexionId: IdSchema,
  numeroVersion: z.number().int().positive(),
  versionProyectoId: IdSchema,
  eliminado: z.boolean(),
  actividadOrigenId: IdSchema,
  actividadDestinoId: IdSchema,
  autorId: IdSchema,
  creadoEn: z.date(),
});
export type ConexionActividadVersion = z.infer<typeof ConexionActividadVersionSchema>;
