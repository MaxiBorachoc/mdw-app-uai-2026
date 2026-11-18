/**
 * Schemas de Zod para valores que se repiten en mas de una entidad: el id y
 * los valores cerrados (enums) del modelo, ver prisma/schema.prisma. Cada
 * entidad tiene su propio archivo en esta carpeta, con su schema y su tipo
 * derivado (z.infer): usuario.ts, proyecto.ts, miembro.ts, historiaUsuario.ts,
 * actividad.ts, conexionActividad.ts, carril.ts y versionProyecto.ts.
 */
import { z } from "zod";

export const IdSchema = z.string().min(1);

export const RolProyectoSchema = z.enum(["OWNER", "EDITOR", "READER"]);
export type RolProyecto = z.infer<typeof RolProyectoSchema>;

export const EstadoInvitacionSchema = z.enum(["PENDIENTE", "ACEPTADA", "RECHAZADA"]);
export type EstadoInvitacion = z.infer<typeof EstadoInvitacionSchema>;

export const EstadoVersionProyectoSchema = z.enum(["EN_DESARROLLO", "CERRADA"]);
export type EstadoVersionProyecto = z.infer<typeof EstadoVersionProyectoSchema>;

/**
 * Una fecha sin hora, "AAAA-MM-DD" (en la base es una columna DATE). Se valida
 * que exista en el calendario: "2026-02-30" no pasa.
 */
export const FechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha tiene que tener el formato AAAA-MM-DD")
  .refine((texto) => {
    const fecha = new Date(`${texto}T00:00:00Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto;
  }, "La fecha no existe");

// H15: en proceso (tiene un build en desarrollo) o finalizado (no tiene).
export const EstadoProyectoSchema = z.enum(["EN_PROCESO", "FINALIZADO"]);
export type EstadoProyecto = z.infer<typeof EstadoProyectoSchema>;

// H16: actividad o nodo de control de UML (ver docs/spec.md seccion 3).
export const TipoNodoSchema = z.enum(["ACTIVIDAD", "INICIAL", "FINAL_ACTIVIDAD", "FINAL_FLUJO", "DECISION", "BIFURCACION"]);
export type TipoNodo = z.infer<typeof TipoNodoSchema>;
