import type { Browser, BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { asegurarEntornoE2E, BASE_URL, type UsuarioE2E } from "./entorno";

const COOKIE_SESION = "authjs.session-token";

/** Crea una sesión JWT real de Auth.js sin agregar un modo prueba a la aplicación. */
export async function contextoAutenticado(browser: Browser, usuario: UsuarioE2E): Promise<BrowserContext> {
  asegurarEntornoE2E();
  const secret = process.env.AUTH_SECRET!;
  const token = await encode({
    secret,
    salt: COOKIE_SESION,
    token: {
      sub: usuario.id,
      usuarioId: usuario.id,
      email: usuario.email,
      name: usuario.nombre,
    },
  });

  const contexto = await browser.newContext();
  await contexto.addCookies([
    {
      name: COOKIE_SESION,
      value: token,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
  return contexto;
}
