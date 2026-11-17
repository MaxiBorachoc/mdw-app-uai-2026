/**
 * H8 y H15: la respuesta HTTP de un cierre de versión que no se pudo hacer. La
 * comparten cerrar-version y finalizar, que cierran el build con las mismas reglas.
 * Todas son 409: dependen del estado del proyecto, no solo del body.
 */
import { NextResponse } from "next/server";
import type { FallaCierre } from "@/lib/db/versiones";
import { formatearVersion, type NumeroVersion } from "@/lib/versiones-proyecto";

export function respuestaFallaCierre(falla: FallaCierre, nueva: NumeroVersion) {
  const conflicto = (cuerpo: Record<string, unknown>) => NextResponse.json(cuerpo, { status: 409 });

  if ("proyecto" in falla) {
    return conflicto({
      error: "El proyecto fue finalizado: no tiene una versión en desarrollo",
      codigo: "PROYECTO_FINALIZADO",
    });
  }
  if ("entregable" in falla) {
    return conflicto(
      falla.entregable === "SIN_ENTREGABLES"
        ? {
            error: "El proyecto todavía no tiene entregables: el dueño tiene que crear uno antes de cerrar la versión",
            codigo: "SIN_ENTREGABLES",
          }
        : { error: "El entregable elegido no existe en este proyecto", codigo: "ENTREGABLE_INEXISTENTE" },
    );
  }

  const veredicto = falla.veredicto;
  if (veredicto.motivo === "SIN_CAMBIOS") {
    return conflicto({ error: "La version en desarrollo no tiene cambios", codigo: "VERSION_SIN_CAMBIOS" });
  }
  if (veredicto.motivo === "DUPLICADA") {
    return conflicto({
      error: `Ya existe una versión cerrada ${formatearVersion(nueva)} en este proyecto`,
      codigo: "VERSION_DUPLICADA",
      versionExistente: veredicto.version,
    });
  }
  return conflicto({
    error: `La versión ${formatearVersion(nueva)} debe quedar por encima de la última versión cerrada (${formatearVersion(veredicto.ultimaCerrada)})`,
    codigo: "VERSION_NO_ASCENDENTE",
    ultimaVersionCerrada: veredicto.ultimaCerrada,
  });
}
