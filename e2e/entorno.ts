import { config as cargarDotenv } from "dotenv";

cargarDotenv({ path: ".env.e2e", override: true });

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export const USUARIOS_E2E = {
  owner: { id: "e2e-owner", email: "owner.e2e@example.test", nombre: "Owner E2E" },
  editor: { id: "e2e-editor", email: "editor.e2e@example.test", nombre: "Editor E2E" },
  reader: { id: "e2e-reader", email: "reader.e2e@example.test", nombre: "Reader E2E" },
  externo: { id: "e2e-externo", email: "externo.e2e@example.test", nombre: "Externo E2E" },
} as const;

export type UsuarioE2E = (typeof USUARIOS_E2E)[keyof typeof USUARIOS_E2E];

function esUrlLocalDePruebas(valor: string | undefined) {
  if (!valor) return false;
  try {
    const url = new URL(valor);
    const hostLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const nombreBase = decodeURIComponent(url.pathname.replace(/^\//, ""));
    return hostLocal && /(e2e|test)/i.test(nombreBase);
  } catch {
    return false;
  }
}

/**
 * Cinturón de seguridad del harness: los E2E destruyen y recrean datos.
 * Solo pueden correr contra una base local cuyo nombre diga e2e o test.
 */
export function asegurarEntornoE2E() {
  if (!esUrlLocalDePruebas(process.env.DATABASE_URL)) {
    throw new Error(
      "E2E bloqueado: DATABASE_URL debe apuntar a PostgreSQL local y a una base cuyo nombre contenga e2e o test.",
    );
  }
  if (!esUrlLocalDePruebas(process.env.DIRECT_URL)) {
    throw new Error(
      "E2E bloqueado: DIRECT_URL debe apuntar a PostgreSQL local y a una base cuyo nombre contenga e2e o test.",
    );
  }
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error("E2E bloqueado: AUTH_SECRET de pruebas debe tener al menos 32 caracteres.");
  }

  const base = new URL(BASE_URL);
  if ((base.hostname !== "localhost" && base.hostname !== "127.0.0.1") || base.protocol !== "http:") {
    throw new Error("E2E bloqueado: E2E_BASE_URL debe ser una URL HTTP local.");
  }

  process.env.AUTH_URL ??= BASE_URL;
  process.env.APP_URL ??= BASE_URL;
  process.env.AUTH_TRUST_HOST ??= "true";
  // Auth.js necesita que el proveedor tenga configuración, pero los tests nunca
  // pasan por Google: la sesión se fabrica desde e2e/sesiones.ts.
  process.env.AUTH_GOOGLE_ID ??= "e2e-google-id";
  process.env.AUTH_GOOGLE_SECRET ??= "e2e-google-secret";
}
