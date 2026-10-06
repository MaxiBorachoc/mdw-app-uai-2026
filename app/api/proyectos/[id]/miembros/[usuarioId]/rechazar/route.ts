/**
 * H2 — Rechazar una invitación desde el link del correo. Mismo razonamiento
 * que aceptar/route.ts (ver ese archivo).
 */
import { NoAutenticado, requerirUsuario } from "@/lib/auth";
import { validarRespuestaAInvitacion } from "@/lib/miembros-proyecto";
import { obtenerMembresia, rechazarInvitacion } from "@/lib/db/miembros";
import { paginaSimple } from "@/lib/api/paginaSimple";

type Contexto = { params: Promise<{ id: string; usuarioId: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id, usuarioId } = await params;
    const usuario = await requerirUsuario();

    if (usuario.id !== usuarioId) {
      return paginaSimple(
        "No es tu invitación",
        "Esta invitación es para otra cuenta. Iniciá sesión con la cuenta invitada e intentá de nuevo.",
        403,
      );
    }

    const veredicto = validarRespuestaAInvitacion(await obtenerMembresia(usuarioId, id));
    if (!veredicto.ok) {
      const mensaje =
        veredicto.motivo === "NO_ES_MIEMBRO"
          ? "No encontramos esa invitación."
          : "Esta invitación ya fue respondida antes.";
      return paginaSimple("Invitación no disponible", mensaje, veredicto.motivo === "NO_ES_MIEMBRO" ? 404 : 409);
    }

    await rechazarInvitacion(id, usuarioId);
    return paginaSimple("Invitación rechazada", "No vas a colaborar en este proyecto.");
  } catch (error) {
    if (error instanceof NoAutenticado) {
      return paginaSimple(
        "Iniciá sesión",
        "Tenés que iniciar sesión con la cuenta invitada para responder esta invitación.",
        401,
      );
    }
    console.error("GET /api/proyectos/:id/miembros/:usuarioId/rechazar", error);
    return paginaSimple("Error", "Algo salió mal. Probá de nuevo en unos minutos.", 500);
  }
}
