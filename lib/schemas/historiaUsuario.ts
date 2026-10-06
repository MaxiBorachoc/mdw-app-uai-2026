/**
 * Entidades de las historias de usuario (H3, H4): HistoriaUsuario es la
 * identidad estable y apunta a su version actual; HistoriaUsuarioVersion es
 * cada revision inmutable (un cambio = una fila nueva).
 */
import { z } from "zod";
import { IdSchema } from "./comun";

// Longitudes maximas: docs/spec.md seccion 3.
export const TITULO_HISTORIA_MAX = 150;
export const DESCRIPCION_HISTORIA_MAX = 2000;
export const CRITERIO_ACEPTACION_MAX = 300;

export const HistoriaUsuarioSchema = z.object({
  id: IdSchema,
  proyectoId: IdSchema,
  versionActualId: IdSchema.nullable(),
  creadoEn: z.date(),
});
export type HistoriaUsuario = z.infer<typeof HistoriaUsuarioSchema>;

export const HistoriaUsuarioVersionSchema = z.object({
  id: IdSchema,
  historiaId: IdSchema,
  numeroVersion: z.number().int().positive(),
  titulo: z
    .string()
    .trim()
    .min(1, "El título es obligatorio")
    .max(TITULO_HISTORIA_MAX, `El título no puede superar los ${TITULO_HISTORIA_MAX} caracteres`),
  descripcion: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria")
    .max(DESCRIPCION_HISTORIA_MAX, `La descripción no puede superar los ${DESCRIPCION_HISTORIA_MAX} caracteres`),
  criteriosAceptacion: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Un criterio de aceptación no puede estar vacío")
        .max(
          CRITERIO_ACEPTACION_MAX,
          `Un criterio de aceptación no puede superar los ${CRITERIO_ACEPTACION_MAX} caracteres`,
        ),
    )
    .min(1, "Hace falta al menos un criterio de aceptación"),
  autorId: IdSchema,
  creadoEn: z.date(),
});
export type HistoriaUsuarioVersion = z.infer<typeof HistoriaUsuarioVersionSchema>;
