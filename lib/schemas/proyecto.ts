/**
 * Entidad Proyecto (H1): el espacio de trabajo donde vive la documentacion.
 */
import { z } from "zod";
import { IdSchema } from "./comun";

export const ProyectoSchema = z.object({
  id: IdSchema,
  nombre: z.string().trim().min(1, "El nombre del proyecto es obligatorio"),
  descripcion: z.string().trim(),
  creadoEn: z.date(),
  ownerId: IdSchema,
});
export type Proyecto = z.infer<typeof ProyectoSchema>;

/** Entrada compartida por la creación y la edición de un proyecto. */
export const crearProyectoSchema = z.object({
  nombre: ProyectoSchema.shape.nombre,
  descripcion: ProyectoSchema.shape.descripcion.default(""),
});
export type CrearProyectoInput = z.infer<typeof crearProyectoSchema>;
