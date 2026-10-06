/**
 * Schemas de Zod para valores que se repiten en mas de una entidad: el id y
 * los valores cerrados (enums) del modelo, ver prisma/schema.prisma. Cada
 * entidad tiene su propio archivo en esta carpeta, con su schema y su tipo
 * derivado (z.infer): usuario.ts, proyecto.ts, miembro.ts, historiaUsuario.ts,
 * actividad.ts, conexionActividad.ts y versionProyecto.ts.
 */
import { z } from "zod";

export const IdSchema = z.string().min(1);

export const RolProyectoSchema = z.enum(["OWNER", "EDITOR", "READER"]);
export type RolProyecto = z.infer<typeof RolProyectoSchema>;

export const EstadoInvitacionSchema = z.enum(["PENDIENTE", "ACEPTADA", "RECHAZADA"]);
export type EstadoInvitacion = z.infer<typeof EstadoInvitacionSchema>;

export const EstadoActividadSchema = z.enum(["PENDIENTE", "EN_PROGRESO", "COMPLETADA"]);
export type EstadoActividad = z.infer<typeof EstadoActividadSchema>;

export const EstadoVersionProyectoSchema = z.enum(["EN_DESARROLLO", "CERRADA"]);
export type EstadoVersionProyecto = z.infer<typeof EstadoVersionProyectoSchema>;

export const TipoVersionProyectoItemSchema = z.enum(["HISTORIA", "ACTIVIDAD"]);
export type TipoVersionProyectoItem = z.infer<typeof TipoVersionProyectoItemSchema>;
