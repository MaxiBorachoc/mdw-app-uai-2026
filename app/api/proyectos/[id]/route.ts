/**
 * H1 — Ver, editar y eliminar un proyecto puntual.
 *
 * Orden de las preguntas del handler: sesion (401), pertenencia (404), rol (403),
 * body (400), consulta. Ademas, las consultas de lib/db llevan el id del usuario
 * de la sesion en el where, asi que aunque este chequeo faltara no devolverian
 * ni modificarian el proyecto de otro.
 */
import { NextResponse } from "next/server";
import { crearProyectoSchema } from "@/lib/schemas/proyecto";
import {
  actualizarProyectoDeOwner,
  eliminarProyectoDeOwner,
  obtenerProyectoDe,
} from "@/lib/db/proyectos";
import { enviarAvisoEliminacion } from "@/lib/servicios/mail";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const acceso = await requerirAccesoAProyecto(id);
    if (!acceso) return proyectoNoEncontrado();

    const proyecto = await obtenerProyectoDe(
      id,
      acceso.usuario.id,
      acceso.rol === "OWNER",
    );
    if (!proyecto) return proyectoNoEncontrado();

    return NextResponse.json(proyecto);
  } catch (error) {
    return responderError("GET /api/proyectos/:id", error);
  }
}

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    // H1: solo el owner puede editar nombre y descripcion del proyecto.
    const acceso = await requerirAccesoAProyecto(id, ["OWNER"]);
    if (!acceso) return proyectoNoEncontrado();

    const body: unknown = await request.json().catch(() => null);
    const resultado = crearProyectoSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten() },
        { status: 400 },
      );
    }

    const proyecto = await actualizarProyectoDeOwner(id, acceso.usuario.id, resultado.data);
    if (!proyecto) return proyectoNoEncontrado();

    return NextResponse.json(proyecto);
  } catch (error) {
    return responderError("PUT /api/proyectos/:id", error);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    // H1: solo el owner puede eliminar el proyecto (cascade total, ver spec.md seccion 3).
    const acceso = await requerirAccesoAProyecto(id, ["OWNER"]);
    if (!acceso) return proyectoNoEncontrado();

    // Se lee antes de borrar: despues del cascade ya no queda MiembroProyecto
    // de donde sacar a quien avisar. Solo colaboradores con invitacion
    // aceptada (los que de verdad llegaron a acceder al proyecto).
    const proyecto = await obtenerProyectoDe(id, acceso.usuario.id);
    const colaboradores =
      proyecto?.miembros.filter((m) => m.estado === "ACEPTADA" && m.usuario.id !== acceso.usuario.id) ??
      [];

    const eliminado = await eliminarProyectoDeOwner(id, acceso.usuario.id);
    if (!eliminado) return proyectoNoEncontrado();

    // Accesorio (seccion 8): el proyecto ya esta borrado aunque algun correo falle.
    await Promise.all(
      colaboradores.map((m) =>
        enviarAvisoEliminacion({ destinatario: m.usuario.email, nombreProyecto: proyecto!.nombre }),
      ),
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return responderError("DELETE /api/proyectos/:id", error);
  }
}
