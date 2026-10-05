/**
 * Reglas de negocio de H2 (colaboradores de un proyecto).
 *
 * Funciones puras: sin Prisma, sin Next y sin reloj. Reciben los datos que
 * alguien ya fue a buscar y devuelven un veredicto (ver docs/spec.md, H2).
 */

export type MembresiaObjetivo = { usuarioId: string; rol: "OWNER" | "EDITOR" | "READER" };

export type VeredictoAlta =
  | { ok: true }
  | { ok: false; motivo: "USUARIO_INEXISTENTE" | "ES_OWNER" | "YA_ES_MIEMBRO" };

export type VeredictoSobreMiembro =
  | { ok: true }
  | { ok: false; motivo: "NO_ES_MIEMBRO" | "ES_OWNER" };

// Agregar: el usuario tiene que existir, no puede ser el owner (que ya es dueño
// del proyecto) ni alguien que ya colabora.
export function validarAltaDeMiembro(
  destino: { id: string } | null,
  ownerId: string,
  miembrosActuales: { usuarioId: string }[],
): VeredictoAlta {
  if (!destino) return { ok: false, motivo: "USUARIO_INEXISTENTE" };
  if (destino.id === ownerId) return { ok: false, motivo: "ES_OWNER" };
  if (miembrosActuales.some((m) => m.usuarioId === destino.id)) {
    return { ok: false, motivo: "YA_ES_MIEMBRO" };
  }
  return { ok: true };
}

// Cambiar el rol o quitar a alguien: tiene que ser colaborador, y el owner no
// se toca (no cambia de rol ni deja de colaborar: para eso elimina el proyecto).
export function validarCambioSobreMiembro(objetivo: MembresiaObjetivo | null): VeredictoSobreMiembro {
  if (!objetivo) return { ok: false, motivo: "NO_ES_MIEMBRO" };
  if (objetivo.rol === "OWNER") return { ok: false, motivo: "ES_OWNER" };
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
