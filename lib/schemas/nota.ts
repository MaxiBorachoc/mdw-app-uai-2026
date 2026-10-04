/**
 * Schemas de validación de la entidad Nota.
 *
 * Un solo schema para el cliente y el servidor: el formulario valida con el
 * mismo objeto con el que valida la API. Si las reglas estuvieran duplicadas,
 * tarde o temprano quedarían distintas.
 * s
 */
import { z } from "zod";

export const crearNotaSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, "El título necesita al menos 3 caracteres")
    .max(120, "El título no puede superar los 120 caracteres"),
  contenido: z
    .string()
    .trim()
    .min(1, "El contenido no puede estar vacío")
    .max(5000, "El contenido no puede superar los 5000 caracteres"),
});

export type CrearNotaInput = z.infer<typeof crearNotaSchema>;
