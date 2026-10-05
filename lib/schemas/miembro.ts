/**
 * Entidad MiembroProyecto (la relacion N-N entre Usuario y Proyecto, con el rol
 * que ese usuario tiene dentro de ese proyecto) y los schemas de entrada de H2
 * (colaboradores): agregar uno por email y cambiar el rol de uno existente.
 * Los usan los dos archivos bajo app/api/proyectos/[id]/miembros/.
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

// El owner solo puede asignar editor o reader. El rol OWNER no se asigna
// nunca: un proyecto tiene un unico owner, el que lo creo.
export const RolColaboradorSchema = z.enum(["EDITOR", "READER"]);
export type RolColaborador = z.infer<typeof RolColaboradorSchema>;

export const agregarMiembroSchema = z.object({
  email: z.string().trim().toLowerCase().email("El email no es válido"),
  rol: RolColaboradorSchema,
});
export type AgregarMiembroInput = z.infer<typeof agregarMiembroSchema>;

export const cambiarRolSchema = z.object({
  rol: RolColaboradorSchema,
});
export type CambiarRolInput = z.infer<typeof cambiarRolSchema>;
