/**
 * Reglas de negocio de H2 (colaboradores de un proyecto).
 *
 * Funciones puras: sin Prisma, sin Next y sin reloj. Reciben los datos que
 * alguien ya fue a buscar y devuelven un veredicto (ver docs/spec.md, H2).
 */

export type EstadoInvitacion = "PENDIENTE" | "ACEPTADA" | "RECHAZADA";

export type MembresiaObjetivo = {
  usuarioId: string;
  rol: "OWNER" | "EDITOR" | "READER";
  estado: EstadoInvitacion;
};

export type VeredictoAlta =
  | { ok: true }
  | { ok: false; motivo: "USUARIO_INEXISTENTE" | "ES_OWNER" | "YA_ES_MIEMBRO" };

export type VeredictoBaja =
  | { ok: true }
  | { ok: false; motivo: "NO_ES_MIEMBRO" | "ES_OWNER" };

export type VeredictoCambioRol =
  | { ok: true }
  | { ok: false; motivo: "NO_ES_MIEMBRO" | "ES_OWNER" | "INVITACION_NO_ACEPTADA" };

export type VeredictoRespuestaInvitacion =
  | { ok: true }
  | { ok: false; motivo: "NO_ES_MIEMBRO" | "YA_RESPONDIDA" };

// Agregar: el usuario tiene que existir, no puede ser el owner (que ya es dueño
// del proyecto). Si ya hay una fila para ese usuario, solo se puede volver a
// invitar cuando la invitacion anterior fue rechazada (H2): en ese caso
// invitarMiembro hace un upsert que la vuelve a poner en pendiente.
export function validarAltaDeMiembro(
  destino: { id: string } | null,
  ownerId: string,
  membresiaExistente: { estado: EstadoInvitacion } | null,
): VeredictoAlta {
  if (!destino) return { ok: false, motivo: "USUARIO_INEXISTENTE" };
  if (destino.id === ownerId) return { ok: false, motivo: "ES_OWNER" };
  if (membresiaExistente && membresiaExistente.estado !== "RECHAZADA") {
    return { ok: false, motivo: "YA_ES_MIEMBRO" };
  }
  return { ok: true };
}

// Quitar a alguien: tiene que ser colaborador (cualquier estado), y el owner
// no se toca (no deja de colaborar: para eso elimina el proyecto).
export function validarBajaDeMiembro(objetivo: MembresiaObjetivo | null): VeredictoBaja {
  if (!objetivo) return { ok: false, motivo: "NO_ES_MIEMBRO" };
  if (objetivo.rol === "OWNER") return { ok: false, motivo: "ES_OWNER" };
  return { ok: true };
}

// Cambiar el rol: ademas de no ser el owner, la invitacion tiene que estar
// aceptada (no tiene sentido asignarle un rol nuevo a alguien pendiente o que
// ya rechazo, ver H2).
export function validarCambioDeRol(objetivo: MembresiaObjetivo | null): VeredictoCambioRol {
  if (!objetivo) return { ok: false, motivo: "NO_ES_MIEMBRO" };
  if (objetivo.rol === "OWNER") return { ok: false, motivo: "ES_OWNER" };
  if (objetivo.estado !== "ACEPTADA") return { ok: false, motivo: "INVITACION_NO_ACEPTADA" };
  return { ok: true };
}

// Aceptar o rechazar: solo tiene sentido sobre una invitacion pendiente.
export function validarRespuestaAInvitacion(
  objetivo: { estado: EstadoInvitacion } | null,
): VeredictoRespuestaInvitacion {
  if (!objetivo) return { ok: false, motivo: "NO_ES_MIEMBRO" };
  if (objetivo.estado !== "PENDIENTE") return { ok: false, motivo: "YA_RESPONDIDA" };
  return { ok: true };
}

// Quitar a un colaborador lo puede hacer el owner (a cualquiera) o el propio
// colaborador sobre si mismo ("No colaborar").
export function puedeQuitarMiembro(
  solicitante: { usuarioId: string; rol: "OWNER" | "EDITOR" | "READER" },
  objetivoUsuarioId: string,
): boolean {
  return solicitante.rol === "OWNER" || solicitante.usuarioId === objetivoUsuarioId;
}
