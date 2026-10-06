/**
 * Entidad Proyecto (H1): el espacio de trabajo donde vive la documentacion.
 */
import { z } from "zod";
import { IdSchema } from "./comun";

// Longitudes maximas: docs/spec.md seccion 3.
export const NOMBRE_PROYECTO_MAX = 100;
export const DESCRIPCION_PROYECTO_MAX = 500;

export const ProyectoSchema = z.object({
  id: IdSchema,
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del proyecto es obligatorio")
    .max(NOMBRE_PROYECTO_MAX, `El nombre del proyecto no puede superar los ${NOMBRE_PROYECTO_MAX} caracteres`),
  descripcion: z
    .string()
    .trim()
    .max(
      DESCRIPCION_PROYECTO_MAX,
      `La descripción del proyecto no puede superar los ${DESCRIPCION_PROYECTO_MAX} caracteres`,
    ),
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
