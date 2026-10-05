-- CreateIndex
CREATE INDEX "ActividadVersion_autorId_idx" ON "ActividadVersion"("autorId");

-- CreateIndex
CREATE INDEX "HistoriaUsuarioVersion_autorId_idx" ON "HistoriaUsuarioVersion"("autorId");

-- CreateIndex
CREATE INDEX "VersionProyecto_autorId_idx" ON "VersionProyecto"("autorId");

-- CreateIndex
CREATE INDEX "VersionProyectoItem_historiaUsuarioVersionId_idx" ON "VersionProyectoItem"("historiaUsuarioVersionId");

-- CreateIndex
CREATE INDEX "VersionProyectoItem_actividadVersionId_idx" ON "VersionProyectoItem"("actividadVersionId");
