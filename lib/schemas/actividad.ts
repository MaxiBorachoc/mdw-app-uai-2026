/**
 * Actividades y diagramas (H5, H6, H7). Una actividad sin padre es un diagrama.
 * Actividad es la identidad (solo id y proyecto); ActividadVersion es cada
 * revisión inmutable: nombre, documentación, padre, posición e historias
 * asociadas, más los campos comunes a todo elemento versionable
 * (docs/spec.md, sección 3).
 *
 * Las reglas que dependen de otras actividades (no moverla a una interna suya,
 * posición solo si tiene padre) no se validan acá sino en lib/documentacion.ts.
 */
import { z } from "zod";
import { IdSchema, TipoNodoSchema } from "./comun";

// Longitudes máximas: docs/spec.md sección 3.
export const NOMBRE_ACTIVIDAD_MAX = 100;
export const DOCUMENTACION_ACTIVIDAD_MAX = 5000;
export const HISTORIAS_POR_ACTIVIDAD_MAX = 200;

export const contenidoActividadSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre de la actividad es obligatorio")
    .max(NOMBRE_ACTIVIDAD_MAX, `El nombre no puede superar los ${NOMBRE_ACTIVIDAD_MAX} caracteres`),
  documentacion: z
    .string()
    .trim()
    .max(DOCUMENTACION_ACTIVIDAD_MAX, `La documentación no puede superar los ${DOCUMENTACION_ACTIVIDAD_MAX} caracteres`),
});

// La posición en el lienzo: null en un diagrama (actividad sin padre).
const posicion = z.number().finite().min(-100_000).max(100_000).nullable();

// En el borrador, el nombre puede venir vacío: los nodos de control no tienen (H16).
// Que una actividad sí lo tenga lo controla reglasDeNodo, igual que el resto de las
// diferencias por tipo.
export const actividadEnBorradorSchema = contenidoActividadSchema.extend({
  tipo: TipoNodoSchema.default("ACTIVIDAD"),
  nombre: z
    .string()
    .trim()
    .max(NOMBRE_ACTIVIDAD_MAX, `El nombre no puede superar los ${NOMBRE_ACTIVIDAD_MAX} caracteres`),
  padreId: IdSchema.nullable(),
  posicionX: posicion,
  posicionY: posicion,
  historiaIds: z.array(IdSchema).max(HISTORIAS_POR_ACTIVIDAD_MAX),
});
export type ActividadContenido = z.infer<typeof actividadEnBorradorSchema>;

/**
 * H16: lo que se puede decidir mirando solo el nodo (sin el resto del proyecto).
 * Una actividad necesita nombre; un nodo de control no tiene nombre, documentación
 * ni historias, y siempre está dentro de un diagrama. Para usar con .superRefine.
 */
export function reglasDeNodo(
  nodo: Pick<ActividadContenido, "tipo" | "nombre" | "documentacion" | "historiaIds" | "padreId"> & { eliminado?: boolean },
  ctx: z.RefinementCtx,
) {
  if (nodo.eliminado) return;
  if (nodo.tipo === "ACTIVIDAD") {
    if (nodo.nombre.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nombre"], message: "El nombre de la actividad es obligatorio" });
    }
    return;
  }
  if (nodo.nombre || nodo.documentacion || nodo.historiaIds.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tipo"],
      message: "Un nodo de control no tiene nombre, documentación ni historias asociadas",
    });
  }
  if (nodo.padreId === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["padreId"], message: "Un nodo de control siempre está dentro de un diagrama" });
  }
}

export const ActividadSchema = z.object({
  id: IdSchema,
  proyectoId: IdSchema,
});
export type Actividad = z.infer<typeof ActividadSchema>;

export const ActividadVersionSchema = contenidoActividadSchema.extend({
  id: IdSchema,
  actividadId: IdSchema,
  numeroVersion: z.number().int().positive(),
  versionProyectoId: IdSchema,
  eliminado: z.boolean(),
  actividadPadreId: IdSchema.nullable(),
  posicionX: posicion,
  posicionY: posicion,
  autorId: IdSchema,
  creadoEn: z.date(),
});
export type ActividadVersion = z.infer<typeof ActividadVersionSchema>;
