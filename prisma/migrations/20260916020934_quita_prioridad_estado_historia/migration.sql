/*
  Warnings:

  - You are about to drop the column `estado` on the `HistoriaUsuarioVersion` table. All the data in the column will be lost.
  - You are about to drop the column `prioridad` on the `HistoriaUsuarioVersion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "HistoriaUsuarioVersion" DROP COLUMN "estado",
DROP COLUMN "prioridad";

-- DropEnum
DROP TYPE "EstadoHistoria";

-- DropEnum
DROP TYPE "PrioridadHistoria";
