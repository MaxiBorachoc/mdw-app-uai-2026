/**
 * Entidades de las versiones de proyecto (H8, H9) y el schema de entrada para
 * cerrar una (lo usa app/api/proyectos/[id]/cerrar-version/route.ts).
 *
 * VersionProyecto es un build: nace EN_DESARROLLO (sin numero) y se cierra con
 * un Version.Build.Patch; "orden" lo ubica entre los builds del proyecto. No
 * tiene autor a proposito y cerrarlo no copia documentacion (docs/spec.md
 * seccion 3).
 *
 * Version, Build y Patch son enteros no negativos, y la combinacion 0.0.0
 * no es valida. El orden ascendente contra la ultima version cerrada del
 * proyecto no se valida aca porque depende de la base: ver lib/versiones-proyecto.ts.
 */
import { z } from "zod";
import { EstadoVersionProyectoSchema, IdSchema } from "./comun";

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
    orden: z.number().int().positive(),
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

export const cerrarVersionProyectoSchema = z
  .object({
    numeroVersion: numeroEntero,
    numeroBuild: numeroEntero,
    numeroPatch: numeroEntero,
    nombre: nombreVersion.optional(),
    descripcion: descripcionVersion.optional(),
    // H8: todo cierre corresponde a un entregable del proyecto (que exista y sea
    // del mismo proyecto lo controla lib/db/versiones.ts).
    entregableId: z.string({ required_error: "Elegí el entregable al que corresponde la versión" }).min(1, "Elegí el entregable al que corresponde la versión"),
  })
  .refine((datos) => datos.numeroVersion > 0 || datos.numeroBuild > 0 || datos.numeroPatch > 0, {
    message: "La combinación 0.0.0 no es válida",
    path: ["numeroPatch"],
  });
export type CerrarVersionProyectoInput = z.infer<typeof cerrarVersionProyectoSchema>;

/**
 * H15: "Finalizar proyecto". Los datos del cierre solo hacen falta si el build en
 * desarrollo tiene cambios; si está vacío, se descarta y no se usan.
 */
export const finalizarProyectoSchema = z.object({
  cierre: cerrarVersionProyectoSchema.optional(),
});
export type FinalizarProyectoInput = z.infer<typeof finalizarProyectoSchema>;
