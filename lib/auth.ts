/**
 * Configuración de autenticación y autorización.
 *
 * Las dos funciones de abajo son las únicas formas válidas de saber quién
 * está haciendo un request. Ningún componente ni endpoint debe leer el
 * usuario de otro lado: si el `userId` viene del cliente, cualquiera puede
 * mentir.
 *
 * Acá NO hay un `rol` global: los roles (OWNER/EDITOR/READER) son por
 * proyecto, via MiembroProyecto — ver docs/adr/0002-auth-jwt-sin-adapter.md.
 * Para verificar el rol dentro de un proyecto especifico se usa
 * `requerirAccesoAProyecto` de `lib/api/autorizar.ts`, no esta funcion.
 */
import { auth } from "@/auth";

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
};

// Los dos errores esperados de la autorizacion: son la unica excepcion al "lo
// esperado se devuelve, lo inesperado se lanza". Se lanzan porque la pregunta
// aparece en la primera linea de cada handler: si olvidarse la dejara pasar, el
// endpoint quedaria abierto sin aviso. Los traduce responderError (lib/api/errores.ts).
export class NoAutenticado extends Error {} // → 401: no hay sesion
export class NoAutorizado extends Error {} // → 403: hay sesion pero el rol no alcanza

/**
 * Devuelve el usuario de la sesión, o null si no hay sesión.
 * Se usa cuando la página funciona con y sin usuario logueado.
 */
export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  const sesion = await auth();
  if (!sesion?.user?.id || !sesion.user.email) return null;

  return {
    id: sesion.user.id,
    email: sesion.user.email,
    nombre: sesion.user.name ?? sesion.user.email,
  };
}

/**
 * Devuelve el usuario de la sesión o corta el request.
 * Se usa en todo lo que requiere estar logueado (la verificación de rol
 * dentro de un proyecto es un paso aparte, ver `requerirAccesoAProyecto`).
 */
export async function requerirUsuario(): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    throw new NoAutenticado();
  }

  return usuario;
}
