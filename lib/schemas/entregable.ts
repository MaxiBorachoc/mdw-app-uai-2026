/**
 * H14: un entregable del proyecto. Lo planifica el dueño con una fecha estimada
 * y lo marca como entregado con la fecha en que se entregó (docs/spec.md,
 * secciones 3 y 6).
 *
 * La fecha de entrega no puede ser posterior a hoy; sí a la estimada (eso es
 * "entregado con atraso"). "Hoy" se calcula en cada validación con .superRefine:
 * nunca queda congelado al construir el schema.
 */
import { z } from "zod";
import { hoyEnArgentina } from "../utils";
import { FechaSchema } from "./comun";

// Longitudes maximas: docs/spec.md seccion 3.
export const NOMBRE_ENTREGABLE_MAX = 100;
export const DESCRIPCION_ENTREGABLE_MAX = 1000;

export const entregableSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre del entregable es obligatorio")
      .max(NOMBRE_ENTREGABLE_MAX, `El nombre del entregable no puede superar los ${NOMBRE_ENTREGABLE_MAX} caracteres`),
    descripcion: z
      .string()
      .trim()
      .max(
        DESCRIPCION_ENTREGABLE_MAX,
        `La descripción del entregable no puede superar los ${DESCRIPCION_ENTREGABLE_MAX} caracteres`,
      )
      .default(""),
    fechaEstimada: FechaSchema,
    entregado: z.boolean().default(false),
    fechaEntrega: FechaSchema.nullable().default(null),
  })
  .superRefine((e, ctx) => {
    if (!e.entregado) return;
    if (!e.fechaEntrega) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fechaEntrega"], message: "Indicá la fecha en que se entregó" });
    } else if (e.fechaEntrega > hoyEnArgentina()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaEntrega"],
        message: "La fecha de entrega no puede ser posterior a hoy",
      });
    }
  })
  // Sin entregar no hay fecha de entrega, aunque el formulario haya mandado una.
  .transform((e) => ({ ...e, fechaEntrega: e.entregado ? e.fechaEntrega : null }));
export type EntregableInput = z.infer<typeof entregableSchema>;

export const EstadoEntregableSchema = z.enum(["PENDIENTE", "ATRASADO", "ENTREGADO_A_TIEMPO", "ENTREGADO_CON_ATRASO"]);
export type EstadoEntregable = z.infer<typeof EstadoEntregableSchema>;

/**
 * Un entregable tal como lo devuelve la API y lo recibe la pantalla: con las
 * fechas como "AAAA-MM-DD" y los builds cerrados que apuntan a él.
 */
export const entregableVistaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string(),
  fechaEstimada: FechaSchema,
  entregado: z.boolean(),
  fechaEntrega: FechaSchema.nullable(),
  versiones: z.array(z.object({ orden: z.number().int(), etiqueta: z.string() })),
});
export type EntregableVista = z.infer<typeof entregableVistaSchema>;
