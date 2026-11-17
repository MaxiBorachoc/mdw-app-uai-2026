/**
 * H8 — Cerrar la version en desarrollo de un proyecto.
 *
 * Es "la operacion del flujo principal que no es un ABM" (clase 4). Las tres
 * capas de la clase 5: Zod valida la forma (400), lib/versiones-proyecto.ts
 * decide si el negocio lo permite (409) y lib/db/versiones.ts lee y escribe.
 * La regla se evalua dentro de la transaccion que bloquea el build en desarrollo,
 * asi un cierre no se mezcla con una confirmacion de cambios ni con otro cierre.
 */
import { NextResponse } from "next/server";
import { cerrarVersionProyectoSchema } from "@/lib/schemas/versionProyecto";
import { cerrarVersionEnDesarrollo } from "@/lib/db/versiones";
import { formatearVersion, type NumeroVersion, type VeredictoCierre } from "@/lib/versiones-proyecto";
import { proyectoNoEncontrado, requerirAccesoAProyecto } from "@/lib/api/autorizar";
import { responderError } from "@/lib/api/errores";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    // Seccion 6: solo owner y editor pueden crear o modificar documentacion.
    const acceso = await requerirAccesoAProyecto(id, ["OWNER", "EDITOR"]);
    if (!acceso) return proyectoNoEncontrado();

    const body: unknown = await request.json().catch(() => null);
    const resultado = cerrarVersionProyectoSchema.safeParse(body);
    if (!resultado.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: resultado.error.flatten() },
        { status: 400 },
      );
    }
    const nueva = resultado.data;

    const cierre = await cerrarVersionEnDesarrollo(id, nueva);
    if (!cierre.ok) return respuestaConflicto(cierre.veredicto, nueva);

    return NextResponse.json({ cerrada: cierre.cerrada, siguiente: cierre.siguiente });
  } catch (error) {
    return responderError("POST /api/proyectos/:id/cerrar-version", error);
  }
}

function respuestaConflicto(veredicto: Extract<VeredictoCierre, { ok: false }>, nueva: NumeroVersion) {
  if (veredicto.motivo === "SIN_CAMBIOS") {
    return NextResponse.json(
      {
        error: "La version en desarrollo no tiene cambios",
        codigo: "VERSION_SIN_CAMBIOS",
      },
      { status: 409 },
    );
  }

  if (veredicto.motivo === "DUPLICADA") {
    return NextResponse.json(
      {
        error: `Ya existe una versión cerrada ${formatearVersion(nueva)} en este proyecto`,
        codigo: "VERSION_DUPLICADA",
        versionExistente: veredicto.version,
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      error: `La versión ${formatearVersion(nueva)} debe quedar por encima de la última versión cerrada (${formatearVersion(veredicto.ultimaCerrada)})`,
      codigo: "VERSION_NO_ASCENDENTE",
      ultimaVersionCerrada: veredicto.ultimaCerrada,
    },
    { status: 409 },
  );
}
