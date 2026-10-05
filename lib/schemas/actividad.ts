/**
 * Entidades del diagrama de actividades (H5, H6, H7): Actividad es el nodo
 * estable (con su posicion y, si esta anidada, su actividad padre) y
 * ActividadVersion es cada revision inmutable de su documentacion.
 */
import { z } from "zod";
import { EstadoActividadSchema, IdSchema } from "./comun";

export const ActividadSchema = z.object({
  id: IdSchema,
  proyectoId: IdSchema,
  actividadPadreId: IdSchema.nullable(),
  versionActualId: IdSchema.nullable(),
  posicionX: z.number(),
  posicionY: z.number(),
  creadoEn: z.date(),
});
export type Actividad = z.infer<typeof ActividadSchema>;

export const ActividadVersionSchema = z.object({
  id: IdSchema,
  actividadId: IdSchema,
  numeroVersion: z.number().int().positive(),
  nombre: z.string().trim().min(1, "El nombre de la actividad es obligatorio"),
  documentacion: z.string().trim(),
  estado: EstadoActividadSchema,
  autorId: IdSchema,
  creadoEn: z.date(),
});
export type ActividadVersion = z.infer<typeof ActividadVersionSchema>;
