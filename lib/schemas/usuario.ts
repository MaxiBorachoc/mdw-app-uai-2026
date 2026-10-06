/**
 * Entidad Usuario: una persona con cuenta. Se crea en el primer login con
 * Google (ver auth.ts), no hay registro aparte.
 */
import { z } from "zod";
import { IdSchema } from "./comun";

export const UsuarioSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  nombre: z.string().trim().min(1),
  creadoEn: z.date(),
});
export type Usuario = z.infer<typeof UsuarioSchema>;
