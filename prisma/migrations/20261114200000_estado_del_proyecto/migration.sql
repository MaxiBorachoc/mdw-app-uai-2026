-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('EN_PROCESO', 'FINALIZADO');

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN     "estado" "EstadoProyecto" NOT NULL DEFAULT 'EN_PROCESO';

