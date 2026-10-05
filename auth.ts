/**
 * Configuracion real de Auth.js. Unico lugar del proyecto que importa
 * "next-auth": el resto del codigo usa el contrato de lib/auth.ts.
 *
 * Sesion en JWT (no PrismaAdapter): no necesitamos las tablas Account/Session
 * que pide el adapter completo porque no guardamos tokens de terceros ni
 * sesiones revocables server-side, y evita ampliar el schema solo para eso
 * (ver docs/adr/0002-auth-jwt-sin-adapter.md). En el primer login con Google
 * se hace upsert del Usuario propio por email, y su id queda en el JWT.
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Solo corre en el sign-in fresco (account viene seteado); en requests
      // subsiguientes el token ya trae usuarioId y no hace falta ir a la base.
      if (account && profile?.email) {
        const usuario = await prisma.usuario.upsert({
          where: { email: profile.email },
          update: { nombre: profile.name ?? profile.email },
          create: { email: profile.email, nombre: profile.name ?? profile.email },
        });
        token.usuarioId = usuario.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.usuarioId && session.user) {
        session.user.id = token.usuarioId as string;
      }
      return session;
    },
  },
});
