/**
 * Acceso a datos de la entidad Proyecto.
 *
 * Ningun componente ni Route Handler habla con Prisma directamente: todos pasan
 * por aca (ver AGENTS.md).
 */
import { prisma } from "@/lib/db/client";
import type { CrearProyectoInput } from "@/lib/schemas/proyecto";

const LIMITE_POR_DEFECTO = 50;

export async function listarProyectosDe(usuarioId: string, limite: number = LIMITE_POR_DEFECTO) {
  return prisma.proyecto.findMany({
    where: { miembros: { some: { usuarioId } } },
    take: limite,
    orderBy: { creadoEn: "desc" },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      creadoEn: true,
      owner: { select: { id: true, nombre: true } },
    },
  });
}

// Devuelve null si el proyecto no existe o el usuario no es miembro: para quien
// pregunta, un proyecto ajeno no existe.
export async function obtenerProyectoDe(id: string, usuarioId: string) {
  return prisma.proyecto.findFirst({
    where: { id, miembros: { some: { usuarioId } } },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      creadoEn: true,
      owner: { select: { id: true, nombre: true } },
      miembros: {
        select: {
          id: true,
          rol: true,
          estado: true,
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      },
    },
  });
}

// Crea el proyecto y, en la misma transaccion, agrega al creador como miembro OWNER:
// H1 pide que "el usuario quede asociado como owner", y eso pasa por MiembroProyecto,
// no por el campo ownerId solo (ownerId identifica al creador; MiembroProyecto es lo
// que le da permisos reales dentro del proyecto, ver H2).
export async function crearProyecto(datos: CrearProyectoInput, ownerId: string) {
  return prisma.proyecto.create({
    data: {
      ...datos,
      ownerId,
      miembros: {
        create: { usuarioId: ownerId, rol: "OWNER", estado: "ACEPTADA" },
      },
      // Spec seccion 6: todo proyecto tiene siempre una version EN_DESARROLLO.
      versiones: {
        create: { estado: "EN_DESARROLLO" },
      },
    },
    select: { id: true, nombre: true, descripcion: true, creadoEn: true, ownerId: true },
  });
}

// El chequeo de "es OWNER" va dentro del mismo where que la escritura (updateMany
// y no update, que exige un where unico): no hay forma de olvidarselo. Devuelve
// null si el proyecto no existe o el usuario no es su OWNER.
export async function actualizarProyectoDeOwner(
  id: string,
  usuarioId: string,
  datos: CrearProyectoInput,
) {
  const { count } = await prisma.proyecto.updateMany({
    where: { id, miembros: { some: { usuarioId, rol: "OWNER" } } },
    data: datos,
  });
  if (count === 0) return null;

  return prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, nombre: true, descripcion: true, creadoEn: true, ownerId: true },
  });
}

// H1: eliminar un proyecto borra en cascada toda su documentacion, incluidas
// las versiones cerradas (ver docs/spec.md seccion 3, "Reglas de borrado").
// La confirmacion previa al usuario la resuelve la UI, no esta funcion.
// Devuelve false si el proyecto no existe o el usuario no es su OWNER.
export async function eliminarProyectoDeOwner(id: string, usuarioId: string) {
  const { count } = await prisma.proyecto.deleteMany({
    where: { id, miembros: { some: { usuarioId, rol: "OWNER" } } },
  });
  return count > 0;
}
