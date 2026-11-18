import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { asegurarEntornoE2E, USUARIOS_E2E } from "./entorno";

/**
 * Global setup de Playwright. Esta base es descartable: aplica migraciones,
 * vacía únicamente las tablas de la aplicación y crea los cuatro usuarios que
 * usan las pruebas. Nunca se ejecuta contra una URL remota (entorno.ts lo impide).
 */
export default async function prepararE2E() {
  asegurarEntornoE2E();

  const prismaCli = join(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js",
  );

  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: process.env,
    stdio: "inherit",
  });

  const prisma = new PrismaClient();
  try {
    // La base es exclusivamente E2E. Se conserva _prisma_migrations para no
    // reaplicar migraciones, y se vacía todo lo demás aunque el modelo crezca.
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE tabla RECORD;
      BEGIN
        FOR tabla IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename <> '_prisma_migrations'
        LOOP
          EXECUTE format('TRUNCATE TABLE %I CASCADE', tabla.tablename);
        END LOOP;
      END $$;
    `);

    await prisma.usuario.createMany({
      data: Object.values(USUARIOS_E2E),
    });
  } finally {
    await prisma.$disconnect();
  }
}
