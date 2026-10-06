/**
 * H2 — Cambiar el rol de un colaborador, o quitarlo ("No colaborar" si se
 * quita a si mismo).
 *
 * Orden de las preguntas del handler: sesion (401), pertenencia (404), rol (403),
 * body (400), regla (409/404), consulta. Las consultas de lib/db llevan el id de
 * la sesion en el where. El mail de despedida es accesorio (ver docs/spec.md
 * seccion 8): va DESPUES de que la baja ya se hizo.
 */
import { NextResponse } from "next/server";
import { NoAutorizado } from "@/lib/auth";
import { cambiarRolSchema } from "@/lib/schemas/miembro";
import { puedeQuitarMiembro, validarBajaDeMiembro, validarCambioDeRol } from "@/lib/miembros-proyecto";
import {
  cambiarRolDeMiembro,
  obtenerDatosParaDespedida,
  obtenerMembresia,
  quitarMiembro,
} from "@/lib/db/miembros";
import { enviarDespedida } from "@/lib/servicios/mail";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";

type Contexto = { params: Promise<{ id: string; usuarioId: string }> };

function respuestaSobreMiembro(motivo: "NO_ES_MIEMBRO" | "ES_OWNER" | "INVITACION_NO_ACEPTADA") {
  if (motivo === "NO_ES_MIEMBRO") {
    return NextResponse.json(
      { error: "El usuario no es colaborador de este proyecto", codigo: motivo },
      { status: 404 },
    );
  }
  if (motivo === "INVITACION_NO_ACEPTADA") {
    return NextResponse.json(
      { error: "No se puede cambiar el rol de una invitación que no fue aceptada", codigo: motivo },
      { status: 409 },
    );
  }
  return NextResponse.json(
    {
      error:
        "El owner no puede cambiar de rol ni dejar de colaborar: para eso puede eliminar el proyecto",
      codigo: motivo,
    },
    { status: 409 },
  );
}

export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const { id, usuarioId } = await params;
    // H2: solo el owner cambia roles.
    const acceso = await requerirAccesoAProyecto(id, ["OWNER"]);
    if (!acceso) return proyectoNoEncontrado();

    const body: unknown = await request.json().catch(() => null);
    const resultado = cambiarRolSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten() },
        { status: 400 },
      );
    }

    const veredicto = validarCambioDeRol(await obtenerMembresia(usuarioId, id));
    if (!veredicto.ok) return respuestaSobreMiembro(veredicto.motivo);

    const cambiado = await cambiarRolDeMiembro(id, usuarioId, resultado.data.rol, acceso.usuario.id);
    if (!cambiado) return respuestaSobreMiembro("NO_ES_MIEMBRO");

    return NextResponse.json({ usuarioId, rol: resultado.data.rol });
  } catch (error) {
    return responderError("PATCH /api/proyectos/:id/miembros/:usuarioId", error);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id, usuarioId } = await params;
    // Cualquier miembro puede llegar hasta aca (para "No colaborar"); el permiso
    // real se decide abajo: el owner quita a cualquiera, un colaborador solo a si mismo.
    const acceso = await requerirAccesoAProyecto(id);
    if (!acceso) return proyectoNoEncontrado();

    if (!puedeQuitarMiembro({ usuarioId: acceso.usuario.id, rol: acceso.rol }, usuarioId)) {
      throw new NoAutorizado();
    }

    const veredicto = validarBajaDeMiembro(await obtenerMembresia(usuarioId, id));
    if (!veredicto.ok) return respuestaSobreMiembro(veredicto.motivo);

    // Se lee antes de borrar: despues de quitarMiembro ya no hay de donde sacar
    // el email ni el nombre del proyecto para el correo.
    const datosDespedida = await obtenerDatosParaDespedida(id, usuarioId);

    const quitado = await quitarMiembro(id, usuarioId, acceso.usuario.id);
    if (!quitado) return respuestaSobreMiembro("NO_ES_MIEMBRO");

    if (datosDespedida) {
      await enviarDespedida({
        destinatario: datosDespedida.usuario.email,
        nombreProyecto: datosDespedida.proyecto.nombre,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return responderError("DELETE /api/proyectos/:id/miembros/:usuarioId", error);
  }
}
