-- CreateTable
CREATE TABLE "Carril" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "Carril_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrilVersion" (
    "id" TEXT NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "nombre" TEXT NOT NULL,
    "posicionX" DOUBLE PRECISION NOT NULL,
    "ancho" DOUBLE PRECISION NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "carrilId" TEXT NOT NULL,
    "diagramaId" TEXT NOT NULL,
    "versionProyectoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "CarrilVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Carril_proyectoId_idx" ON "Carril"("proyectoId");

-- CreateIndex
CREATE INDEX "CarrilVersion_diagramaId_idx" ON "CarrilVersion"("diagramaId");

-- CreateIndex
CREATE INDEX "CarrilVersion_versionProyectoId_idx" ON "CarrilVersion"("versionProyectoId");

-- CreateIndex
CREATE INDEX "CarrilVersion_autorId_idx" ON "CarrilVersion"("autorId");

-- CreateIndex
CREATE UNIQUE INDEX "CarrilVersion_carrilId_numeroVersion_key" ON "CarrilVersion"("carrilId", "numeroVersion");

-- AddForeignKey
ALTER TABLE "Carril" ADD CONSTRAINT "Carril_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrilVersion" ADD CONSTRAINT "CarrilVersion_carrilId_fkey" FOREIGN KEY ("carrilId") REFERENCES "Carril"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrilVersion" ADD CONSTRAINT "CarrilVersion_diagramaId_fkey" FOREIGN KEY ("diagramaId") REFERENCES "Actividad"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrilVersion" ADD CONSTRAINT "CarrilVersion_versionProyectoId_fkey" FOREIGN KEY ("versionProyectoId") REFERENCES "VersionProyecto"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrilVersion" ADD CONSTRAINT "CarrilVersion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

