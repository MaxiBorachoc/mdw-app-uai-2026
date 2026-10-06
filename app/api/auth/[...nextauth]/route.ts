/**
 * Expone las rutas que Auth.js necesita para el login: /api/auth/signin,
 * /api/auth/callback/google, /api/auth/signout, etc. La configuracion real
 * (proveedor, sesion, el upsert del Usuario) esta en auth.ts, en la raiz.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
