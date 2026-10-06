/**
 * Los links de aceptar/rechazar invitacion (H2) se abren desde un cliente de
 * mail, no desde la interfaz: no tiene sentido devolverles JSON. Esta es la
 * unica respuesta HTML de la API, sin React ni CSS, solo para que la persona
 * que clickeo entienda que paso.
 */
import { NextResponse } from "next/server";

export function paginaSimple(titulo: string, mensaje: string, status = 200) {
  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${titulo}</title></head>
<body style="font-family: sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
  <h1>${titulo}</h1>
  <p>${mensaje}</p>
</body>
</html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
