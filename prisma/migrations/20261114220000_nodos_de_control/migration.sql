-- CreateEnum
CREATE TYPE "TipoNodo" AS ENUM ('ACTIVIDAD', 'INICIAL', 'FINAL_ACTIVIDAD', 'FINAL_FLUJO', 'DECISION', 'BIFURCACION');

-- AlterTable
ALTER TABLE "ActividadVersion" ADD COLUMN     "tipo" "TipoNodo" NOT NULL DEFAULT 'ACTIVIDAD';

-- AlterTable
ALTER TABLE "ConexionActividadVersion" ADD COLUMN     "guarda" TEXT NOT NULL DEFAULT '';

