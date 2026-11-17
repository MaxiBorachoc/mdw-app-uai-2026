/**
 * Acceso a datos de la entidad Proyecto.
 *
 * Ningun componente ni Route Handler habla con Prisma directamente: todos pasan
 * por aca (ver AGENTS.md).
 */
import { prisma } from "@/lib/db/client";
import type { CrearProyectoInput, DefinicionProyecto } from "@/lib/schemas/proyecto";
import { fechaDeTexto, textoDeFecha } from "@/lib/utils";

const LIMITE_POR_DEFECTO = 50;

// H13: los campos de la definicion del proyecto, para sumar a un select.
export const selectDefinicion = {
  problemaNegocio: true,
  objetivo: true,
  limitesExclusiones: true,
  fechaInicio: true,
  fechaFinEstimada: true,
} as const;

/** Las fechas de la definicion (columnas DATE) pasadas a "AAAA-MM-DD". */
export function conFechasDeTexto<T extends { fechaInicio: Date | null; fechaFinEstimada: Date | null }>(proyecto: T) {
  return {
    ...proyecto,
    fechaInicio: proyecto.fechaInicio ? textoDeFecha(proyecto.fechaInicio) : null,
    fechaFinEstimada: proyecto.fechaFinEstimada ? textoDeFecha(proyecto.fechaFinEstimada) : null,
  };
}

export async function listarProyectosDe(usuarioId: string, limite: number = LIMITE_POR_DEFECTO) {
  return prisma.proyecto.findMany({
    where: {
      miembros: {
        some: {
          usuarioId,
          estado: "ACEPTADA",
        },
      },
    },
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
export async function obtenerProyectoDe(
  id: string,
  usuarioId: string,
  incluirInvitacionesNoAceptadas: boolean = false,
) {
  const proyecto = await prisma.proyecto.findFirst({
    where: {
      id,
      miembros: {
        some: {
          usuarioId,
          estado: "ACEPTADA",
        },
      },
    },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      creadoEn: true,
      ...selectDefinicion,
      owner: { select: { id: true, nombre: true } },
      miembros: {
        where: incluirInvitacionesNoAceptadas
          ? undefined
          : { estado: "ACEPTADA" },
        select: {
          id: true,
          rol: true,
          estado: true,
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      },
    },
  });
  return proyecto && conFechasDeTexto(proyecto);
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
        create: { estado: "EN_DESARROLLO", orden: 1 },
      },
    },
    select: { id: true, nombre: true, descripcion: true, creadoEn: true, ownerId: true },
  });
}

// H1 y H13: el dueño reemplaza nombre, descripcion y definicion del proyecto. La
// definicion no se versiona: se pisa la anterior (docs/spec.md seccion 6).
// El chequeo de "es OWNER" va dentro del mismo where que la escritura (updateMany
// y no update, que exige un where unico): no hay forma de olvidarselo. Devuelve
// null si el proyecto no existe o el usuario no es su OWNER.
export async function actualizarProyectoDeOwner(
  id: string,
  usuarioId: string,
  datos: DefinicionProyecto,
) {
  const { count } = await prisma.proyecto.updateMany({
    where: {
      id,
      miembros: {
        some: {
          usuarioId,
          rol: "OWNER",
          estado: "ACEPTADA",
        },
      },
    },
    data: {
      ...datos,
      fechaInicio: datos.fechaInicio ? fechaDeTexto(datos.fechaInicio) : null,
      fechaFinEstimada: datos.fechaFinEstimada ? fechaDeTexto(datos.fechaFinEstimada) : null,
    },
  });
  if (count === 0) return null;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    select: { id: true, nombre: true, descripcion: true, creadoEn: true, ownerId: true, ...selectDefinicion },
  });
  return proyecto && conFechasDeTexto(proyecto);
}

// H1: eliminar un proyecto borra en cascada toda su documentacion, incluidas
// las versiones cerradas (ver docs/spec.md seccion 3, "Reglas de borrado").
// La confirmacion previa al usuario la resuelve la UI, no esta funcion.
// Devuelve false si el proyecto no existe o el usuario no es su OWNER.
export async function eliminarProyectoDeOwner(id: string, usuarioId: string) {
  const { count } = await prisma.proyecto.deleteMany({
    where: {
      id,
      miembros: {
        some: {
          usuarioId,
          rol: "OWNER",
          estado: "ACEPTADA",
        },
      },
    },
  });
  return count > 0;
}
