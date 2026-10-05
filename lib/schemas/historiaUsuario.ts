/**
 * Entidades de las historias de usuario (H3, H4): HistoriaUsuario es la
 * identidad estable y apunta a su version actual; HistoriaUsuarioVersion es
 * cada revision inmutable (un cambio = una fila nueva).
 */
import { z } from "zod";
import { IdSchema } from "./comun";

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
  titulo: z.string().trim().min(1, "El título es obligatorio"),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria"),
  criteriosAceptacion: z.array(z.string().trim().min(1)),
  autorId: IdSchema,
  creadoEn: z.date(),
});
export type HistoriaUsuarioVersion = z.infer<typeof HistoriaUsuarioVersionSchema>;
