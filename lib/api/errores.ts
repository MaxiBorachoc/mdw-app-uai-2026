/**
 * Un solo lugar que traduce los errores de un handler a respuesta HTTP:
 * NoAutenticado → 401, NoAutorizado → 403, cualquier otra cosa → 500 generico.
 * Del 500 el detalle queda en el log (con el nombre del endpoint) y nunca
 * llega al cliente. Los demas errores esperados (400, 404, 409) los devuelve
 * cada handler como respuesta explicita (ver docs/api.md).
 */
import { NextResponse } from "next/server";
import { NoAutenticado, NoAutorizado } from "@/lib/auth";

export function responderError(endpoint: string, error: unknown) {
  if (error instanceof NoAutenticado) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (error instanceof NoAutorizado) {
    return NextResponse.json(
      { error: "Tu rol en este proyecto no permite esta operación" },
      { status: 403 },
    );
  }

  console.error(endpoint, error);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
