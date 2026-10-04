import path from "node:path";
import { config as cargarEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const raiz = import.meta.dirname;

cargarEnv({ path: path.join(raiz, ".env.local"), quiet: true });
cargarEnv({ path: path.join(raiz, ".env"), quiet: true });

export default defineConfig({
  schema: path.join(raiz, "prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
