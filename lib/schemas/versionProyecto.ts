/**
 * Entidades de las versiones de proyecto (H8, H9) y el schema de entrada para
 * cerrar una (lo usa app/api/proyectos/[id]/cerrar-version/route.ts).
 *
 * VersionProyecto nace EN_DESARROLLO (sin numero) y se cierra con un
 * Version.Build.Patch; no tiene autor a proposito (docs/spec.md seccion 3).
 * VersionProyectoItem es la referencia a la version exacta de una historia o
 * actividad que quedo congelada al cerrarla.
 *
 * Version, Build y Patch son enteros no negativos, y la combinacion 0.0.0
 * no es valida. El orden ascendente contra la ultima version cerrada del
 * proyecto no se valida aca porque depende de la base: ver lib/versiones-proyecto.ts.
 */
import { z } from "zod";
import {
  EstadoVersionProyectoSchema,
  IdSchema,
  TipoVersionProyectoItemSchema,
} from "./comun";

// Longitudes maximas: docs/spec.md seccion 3.
export const NOMBRE_VERSION_MAX = 100;
export const DESCRIPCION_VERSION_MAX = 1000;

const nombreVersion = z
  .string()
  .trim()
  .max(NOMBRE_VERSION_MAX, `El nombre de la versión no puede superar los ${NOMBRE_VERSION_MAX} caracteres`);

const descripcionVersion = z
  .string()
  .trim()
  .max(
    DESCRIPCION_VERSION_MAX,
    `La descripción de la versión no puede superar los ${DESCRIPCION_VERSION_MAX} caracteres`,
  );

const numeroEntero = z.number().int().nonnegative();

export const VersionProyectoSchema = z
  .object({
    id: IdSchema,
    proyectoId: IdSchema,
    estado: EstadoVersionProyectoSchema,
    numeroVersion: numeroEntero.nullable(),
    numeroBuild: numeroEntero.nullable(),
    numeroPatch: numeroEntero.nullable(),
    nombre: nombreVersion.nullable(),
    descripcion: descripcionVersion.nullable(),
    cerradaEl: z.date().nullable(),
    creadoEn: z.date(),
  })
  .refine(
    (v) => {
      const numeros = [v.numeroVersion, v.numeroBuild, v.numeroPatch];
      return v.estado === "CERRADA"
        ? numeros.every((n) => n !== null) && v.cerradaEl !== null
        : numeros.every((n) => n === null) && v.cerradaEl === null;
    },
    { message: "Una versión cerrada tiene Version.Build.Patch y fecha de cierre; una en desarrollo, ninguno" },
  );
export type VersionProyecto = z.infer<typeof VersionProyectoSchema>;

export const VersionProyectoItemSchema = z
  .object({
    id: IdSchema,
    versionProyectoId: IdSchema,
    tipo: TipoVersionProyectoItemSchema,
    historiaUsuarioVersionId: IdSchema.nullable(),
    actividadVersionId: IdSchema.nullable(),
  })
  .refine(
    (i) =>
      i.tipo === "HISTORIA"
        ? i.historiaUsuarioVersionId !== null && i.actividadVersionId === null
        : i.actividadVersionId !== null && i.historiaUsuarioVersionId === null,
    { message: "Exactamente uno de los dos campos va completo, según el tipo" },
  );
export type VersionProyectoItem = z.infer<typeof VersionProyectoItemSchema>;

export const cerrarVersionProyectoSchema = z
  .object({
    numeroVersion: numeroEntero,
    numeroBuild: numeroEntero,
    numeroPatch: numeroEntero,
    nombre: nombreVersion.optional(),
    descripcion: descripcionVersion.optional(),
  })
  .refine((datos) => datos.numeroVersion > 0 || datos.numeroBuild > 0 || datos.numeroPatch > 0, {
    message: "La combinación 0.0.0 no es válida",
    path: ["numeroPatch"],
  });
export type CerrarVersionProyectoInput = z.infer<typeof cerrarVersionProyectoSchema>;
