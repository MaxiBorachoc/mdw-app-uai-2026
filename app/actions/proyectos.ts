"use server";

/**
 * Server Action de H1 (crear proyecto). Sigue el mismo patron que los Route
 * Handlers: autorizar, validar con Zod, delegar a lib/db.
 */
import { revalidatePath } from "next/cache";
import { requerirUsuario } from "@/lib/auth";
import { crearProyectoSchema } from "@/lib/schemas/proyecto";
import { crearProyecto } from "@/lib/db/proyectos";

export type EstadoCrearProyecto = { error: string } | null;

export async function crearProyectoAction(
  _estadoPrevio: EstadoCrearProyecto,
  formData: FormData,
): Promise<EstadoCrearProyecto> {
  const usuario = await requerirUsuario();

  const resultado = crearProyectoSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion"),
  });

  if (!resultado.success) {
    return { error: resultado.error.issues[0]?.message ?? "Datos inválidos" };
  }

  await crearProyecto(resultado.data, usuario.id);
  revalidatePath("/");
  return null;
}
