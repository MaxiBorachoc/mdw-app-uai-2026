/**
 * H2 — Aceptar una invitación desde el link del correo.
 *
 * No pasa por requerirAccesoAProyecto (exige invitación ya aceptada): esta es
 * justo la ruta que atiende una invitación PENDIENTE. Requiere sesión con la
 * cuenta invitada, para que nadie pueda aceptar la invitación de otra persona
 * reenviando o filtrando el link.
 */
import { NoAutenticado, requerirUsuario } from "@/lib/auth";
import { validarRespuestaAInvitacion } from "@/lib/miembros-proyecto";
import { aceptarInvitacion, obtenerMembresia } from "@/lib/db/miembros";
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

    await aceptarInvitacion(id, usuarioId);
    return paginaSimple("Invitación aceptada", "Ya sos colaborador del proyecto.");
  } catch (error) {
    if (error instanceof NoAutenticado) {
      return paginaSimple(
        "Iniciá sesión",
        "Tenés que iniciar sesión con la cuenta invitada para responder esta invitación.",
        401,
      );
    }
    console.error("GET /api/proyectos/:id/miembros/:usuarioId/aceptar", error);
    return paginaSimple("Error", "Algo salió mal. Probá de nuevo en unos minutos.", 500);
  }
}
