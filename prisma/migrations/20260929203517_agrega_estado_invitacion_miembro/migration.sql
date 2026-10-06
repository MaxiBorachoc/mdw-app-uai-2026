/*
  Warnings:

  - Added the required column `estado` to the `MiembroProyecto` table.
  - Las filas existentes nacieron todas "aceptadas" (H2 no tenia invitaciones
    pendientes todavia): se agregan con ese valor por defecto y despues se
    saca el default, para que de aca en mas cada insert lo decida a proposito.

*/
-- CreateEnum
CREATE TYPE "EstadoInvitacion" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA');

-- AlterTable
ALTER TABLE "MiembroProyecto" ADD COLUMN "estado" "EstadoInvitacion" NOT NULL DEFAULT 'ACEPTADA';

-- AlterTable
ALTER TABLE "MiembroProyecto" ALTER COLUMN "estado" DROP DEFAULT;
