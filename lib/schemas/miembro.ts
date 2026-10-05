/**
 * Entidad MiembroProyecto (H2): la relacion N-N entre Usuario y Proyecto, con
 * el rol que ese usuario tiene dentro de ese proyecto.
 */
import { z } from "zod";
import { IdSchema, RolProyectoSchema } from "./comun";

export const MiembroProyectoSchema = z.object({
  id: IdSchema,
  usuarioId: IdSchema,
  proyectoId: IdSchema,
  rol: RolProyectoSchema,
  creadoEn: z.date(),
});
export type MiembroProyecto = z.infer<typeof MiembroProyectoSchema>;
