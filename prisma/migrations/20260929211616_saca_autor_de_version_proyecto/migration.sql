/*
  Warnings:

  - Se elimina la columna `autorId` de `VersionProyecto` (y sus 2 valores no nulos
    actuales, que solo estaban ahi por el schema anterior). Una version de proyecto
    no tiene autor: documenta el estado del proyecto en un momento, no algo que una
    persona firma. Ver docs/spec.md seccion 3.

*/
-- DropForeignKey
ALTER TABLE "VersionProyecto" DROP CONSTRAINT "VersionProyecto_autorId_fkey";

-- DropIndex
DROP INDEX "VersionProyecto_autorId_idx";

-- AlterTable
ALTER TABLE "VersionProyecto" DROP COLUMN "autorId";
