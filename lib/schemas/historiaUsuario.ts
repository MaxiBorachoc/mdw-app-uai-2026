/**
 * Historias de usuario (H3, H4). HistoriaUsuario es la identidad (solo id y
 * proyecto); HistoriaUsuarioVersion es cada revisión inmutable, con los campos
 * comunes a todo elemento versionable (docs/spec.md, sección 3).
 *
 * contenidoHistoriaSchema es lo que carga el usuario: lo usan el formulario del
 * navegador y el servidor al confirmar cambios, así la regla es una sola.
 */
import { z } from "zod";
import { IdSchema } from "./comun";

// Longitudes máximas: docs/spec.md sección 3.
export const TITULO_HISTORIA_MAX = 150;
export const DESCRIPCION_HISTORIA_MAX = 2000;
export const CRITERIO_ACEPTACION_MAX = 1000;
export const CRITERIOS_MAX = 50;

export const contenidoHistoriaSchema = z.object({
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
    .min(1, "Hace falta al menos un criterio de aceptación")
    .max(CRITERIOS_MAX, `No puede haber más de ${CRITERIOS_MAX} criterios de aceptación`),
});
export type HistoriaContenido = z.infer<typeof contenidoHistoriaSchema>;

export const HistoriaUsuarioSchema = z.object({
  id: IdSchema,
  proyectoId: IdSchema,
});
export type HistoriaUsuario = z.infer<typeof HistoriaUsuarioSchema>;

export const HistoriaUsuarioVersionSchema = contenidoHistoriaSchema.extend({
  id: IdSchema,
  historiaId: IdSchema,
  numeroVersion: z.number().int().positive(),
  versionProyectoId: IdSchema,
  eliminado: z.boolean(),
  autorId: IdSchema,
  creadoEn: z.date(),
});
export type HistoriaUsuarioVersion = z.infer<typeof HistoriaUsuarioVersionSchema>;
