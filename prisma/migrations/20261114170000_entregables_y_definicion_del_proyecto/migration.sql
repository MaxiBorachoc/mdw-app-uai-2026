-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN     "fechaFinEstimada" DATE,
ADD COLUMN     "fechaInicio" DATE,
ADD COLUMN     "limitesExclusiones" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "objetivo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "problemaNegocio" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "VersionProyecto" ADD COLUMN     "entregableId" TEXT;

-- CreateTable
CREATE TABLE "Entregable" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "fechaEstimada" DATE NOT NULL,
    "entregado" BOOLEAN NOT NULL DEFAULT false,
    "fechaEntrega" DATE,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "Entregable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Entregable_proyectoId_idx" ON "Entregable"("proyectoId");

-- CreateIndex
CREATE INDEX "VersionProyecto_entregableId_idx" ON "VersionProyecto"("entregableId");

-- AddForeignKey
ALTER TABLE "Entregable" ADD CONSTRAINT "Entregable_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionProyecto" ADD CONSTRAINT "VersionProyecto_entregableId_fkey" FOREIGN KEY ("entregableId") REFERENCES "Entregable"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

