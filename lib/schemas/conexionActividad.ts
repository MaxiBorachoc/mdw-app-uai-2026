/**
 * Entidad ConexionActividad (H5): la flecha entre dos actividades del mismo
 * proyecto y del mismo nivel de diagrama. Esa regla depende de la base (hay
 * que comparar las actividades padre de ambas), asi que no se valida aca sino
 * en lib/db, ver docs/spec.md seccion 6.
 */
import { z } from "zod";
import { IdSchema } from "./comun";

export const ConexionActividadSchema = z.object({
  id: IdSchema,
  proyectoId: IdSchema,
  actividadOrigenId: IdSchema,
  actividadDestinoId: IdSchema,
  creadoEn: z.date(),
});
export type ConexionActividad = z.infer<typeof ConexionActividadSchema>;
