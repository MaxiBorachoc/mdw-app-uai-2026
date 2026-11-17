/**
 * Entidad Proyecto (H1): el espacio de trabajo donde vive la documentacion, y su
 * definicion (H13): problema de negocio, objetivo, limites y fechas.
 */
import { z } from "zod";
import { FechaSchema, IdSchema } from "./comun";

// Longitudes maximas: docs/spec.md seccion 3.
export const NOMBRE_PROYECTO_MAX = 100;
export const DESCRIPCION_PROYECTO_MAX = 500;
export const PROBLEMA_NEGOCIO_MAX = 2000;
export const OBJETIVO_PROYECTO_MAX = 1000;
export const LIMITE_EXCLUSION_MAX = 300;
// La spec no limita la cantidad de limites y exclusiones. Este tope es solo una
// proteccion tecnica contra pedidos gigantes armados a mano: nadie llega en la UI.
export const LIMITES_EXCLUSIONES_TOPE_TECNICO = 1000;

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

/**
 * H13: la definicion completa del proyecto, tal como la guarda el dueño. El PUT
 * de /api/proyectos/:id reemplaza todos los campos: los opcionales que no vienen
 * quedan vacios.
 */
export const definicionProyectoSchema = z
  .object({
    nombre: ProyectoSchema.shape.nombre,
    descripcion: ProyectoSchema.shape.descripcion.default(""),
    problemaNegocio: z
      .string()
      .trim()
      .max(PROBLEMA_NEGOCIO_MAX, `El problema de negocio no puede superar los ${PROBLEMA_NEGOCIO_MAX} caracteres`)
      .default(""),
    objetivo: z
      .string()
      .trim()
      .max(OBJETIVO_PROYECTO_MAX, `El objetivo no puede superar los ${OBJETIVO_PROYECTO_MAX} caracteres`)
      .default(""),
    limitesExclusiones: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Un límite o exclusión no puede estar vacío")
          .max(LIMITE_EXCLUSION_MAX, `Un límite o exclusión no puede superar los ${LIMITE_EXCLUSION_MAX} caracteres`),
      )
      .max(LIMITES_EXCLUSIONES_TOPE_TECNICO)
      .default([]),
    fechaInicio: FechaSchema.nullable().default(null),
    fechaFinEstimada: FechaSchema.nullable().default(null),
  })
  .refine((d) => !d.fechaInicio || !d.fechaFinEstimada || d.fechaFinEstimada >= d.fechaInicio, {
    message: "La fecha estimada de fin no puede ser anterior a la fecha de inicio",
    path: ["fechaFinEstimada"],
  });
export type DefinicionProyecto = z.infer<typeof definicionProyectoSchema>;
