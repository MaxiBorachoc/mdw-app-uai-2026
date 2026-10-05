// Ampliacion de tipos de Auth.js: el JWT y la sesion llevan el id de nuestra
// tabla Usuario (no el id que Google asigna a la cuenta).
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    usuarioId?: string;
  }
}
