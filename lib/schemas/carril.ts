/**
 * Carriles de un diagrama (H17). Carril es la identidad (solo id y proyecto);
 * CarrilVersion es cada revisión inmutable: el diagrama al que pertenece, el
 * nombre, la posición X y el ancho, más los campos comunes a todo elemento
 * versionable (docs/spec.md, sección 3).
 *
 * Un carril es solo visual: no registra qué nodos quedan dentro. Que el nombre no
 * se repita en el diagrama y que el diagrama exista dependen del resto del
 * proyecto, así que no se validan acá sino en lib/documentacion.ts.
 */
import { z } from "zod";
import { IdSchema } from "./comun";

// docs/spec.md sección 3.
export const NOMBRE_CARRIL_MAX = 100;
export const ANCHO_CARRIL_MIN = 120;
export const ANCHO_CARRIL_MAX = 2000;

export const carrilEnBorradorSchema = z.object({
  diagramaId: IdSchema,
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del carril es obligatorio")
    .max(NOMBRE_CARRIL_MAX, `El nombre no puede superar los ${NOMBRE_CARRIL_MAX} caracteres`),
  posicionX: z.number().finite().min(-100_000).max(100_000),
  ancho: z
    .number()
    .finite()
    .min(ANCHO_CARRIL_MIN, `El carril no puede ser más angosto que ${ANCHO_CARRIL_MIN}`)
    .max(ANCHO_CARRIL_MAX, `El carril no puede ser más ancho que ${ANCHO_CARRIL_MAX}`),
});
export type CarrilContenido = z.infer<typeof carrilEnBorradorSchema>;

export const CarrilSchema = z.object({
  id: IdSchema,
  proyectoId: IdSchema,
});
export type Carril = z.infer<typeof CarrilSchema>;

export const CarrilVersionSchema = carrilEnBorradorSchema.extend({
  id: IdSchema,
  carrilId: IdSchema,
  numeroVersion: z.number().int().positive(),
  versionProyectoId: IdSchema,
  eliminado: z.boolean(),
  autorId: IdSchema,
  creadoEn: z.date(),
});
export type CarrilVersion = z.infer<typeof CarrilVersionSchema>;
