-- CreateEnum
CREATE TYPE "RolProyecto" AS ENUM ('OWNER', 'EDITOR', 'READER');

-- CreateEnum
CREATE TYPE "PrioridadHistoria" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "EstadoHistoria" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'TERMINADA');

-- CreateEnum
CREATE TYPE "EstadoActividad" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "EstadoVersionProyecto" AS ENUM ('EN_DESARROLLO', 'CERRADA');

-- CreateEnum
CREATE TYPE "TipoVersionProyectoItem" AS ENUM ('HISTORIA', 'ACTIVIDAD');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiembroProyecto" (
    "id" TEXT NOT NULL,
    "rol" "RolProyecto" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,

    CONSTRAINT "MiembroProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriaUsuario" (
    "id" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proyectoId" TEXT NOT NULL,
    "versionActualId" TEXT,

    CONSTRAINT "HistoriaUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriaUsuarioVersion" (
    "id" TEXT NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "criteriosAceptacion" TEXT[],
    "prioridad" "PrioridadHistoria" NOT NULL,
    "estado" "EstadoHistoria" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "historiaId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "HistoriaUsuarioVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "posicionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "posicionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proyectoId" TEXT NOT NULL,
    "actividadPadreId" TEXT,
    "versionActualId" TEXT,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActividadVersion" (
    "id" TEXT NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "documentacion" TEXT NOT NULL,
    "estado" "EstadoActividad" NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actividadId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "ActividadVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConexionActividad" (
    "id" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proyectoId" TEXT NOT NULL,
    "actividadOrigenId" TEXT NOT NULL,
    "actividadDestinoId" TEXT NOT NULL,

    CONSTRAINT "ConexionActividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionProyecto" (
    "id" TEXT NOT NULL,
    "estado" "EstadoVersionProyecto" NOT NULL DEFAULT 'EN_DESARROLLO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numeroVersion" INTEGER,
    "numeroBuild" INTEGER,
    "numeroPatch" INTEGER,
    "nombre" TEXT,
    "descripcion" TEXT,
    "cerradaEl" TIMESTAMP(3),
    "proyectoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "VersionProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersionProyectoItem" (
    "id" TEXT NOT NULL,
    "tipo" "TipoVersionProyectoItem" NOT NULL,
    "versionProyectoId" TEXT NOT NULL,
    "historiaUsuarioVersionId" TEXT,
    "actividadVersionId" TEXT,

    CONSTRAINT "VersionProyectoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Proyecto_ownerId_idx" ON "Proyecto"("ownerId");

-- CreateIndex
CREATE INDEX "MiembroProyecto_proyectoId_idx" ON "MiembroProyecto"("proyectoId");

-- CreateIndex
CREATE INDEX "MiembroProyecto_usuarioId_idx" ON "MiembroProyecto"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "MiembroProyecto_usuarioId_proyectoId_key" ON "MiembroProyecto"("usuarioId", "proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoriaUsuario_versionActualId_key" ON "HistoriaUsuario"("versionActualId");

-- CreateIndex
CREATE INDEX "HistoriaUsuario_proyectoId_idx" ON "HistoriaUsuario"("proyectoId");

-- CreateIndex
CREATE INDEX "HistoriaUsuarioVersion_historiaId_idx" ON "HistoriaUsuarioVersion"("historiaId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoriaUsuarioVersion_historiaId_numeroVersion_key" ON "HistoriaUsuarioVersion"("historiaId", "numeroVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Actividad_versionActualId_key" ON "Actividad"("versionActualId");

-- CreateIndex
CREATE INDEX "Actividad_proyectoId_idx" ON "Actividad"("proyectoId");

-- CreateIndex
CREATE INDEX "Actividad_actividadPadreId_idx" ON "Actividad"("actividadPadreId");

-- CreateIndex
CREATE INDEX "ActividadVersion_actividadId_idx" ON "ActividadVersion"("actividadId");

-- CreateIndex
CREATE UNIQUE INDEX "ActividadVersion_actividadId_numeroVersion_key" ON "ActividadVersion"("actividadId", "numeroVersion");

-- CreateIndex
CREATE INDEX "ConexionActividad_proyectoId_idx" ON "ConexionActividad"("proyectoId");

-- CreateIndex
CREATE INDEX "ConexionActividad_actividadDestinoId_idx" ON "ConexionActividad"("actividadDestinoId");

-- CreateIndex
CREATE UNIQUE INDEX "ConexionActividad_actividadOrigenId_actividadDestinoId_key" ON "ConexionActividad"("actividadOrigenId", "actividadDestinoId");

-- CreateIndex
CREATE INDEX "VersionProyecto_proyectoId_idx" ON "VersionProyecto"("proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX "VersionProyecto_proyectoId_numeroVersion_numeroBuild_numero_key" ON "VersionProyecto"("proyectoId", "numeroVersion", "numeroBuild", "numeroPatch");

-- CreateIndex
CREATE INDEX "VersionProyectoItem_versionProyectoId_idx" ON "VersionProyectoItem"("versionProyectoId");

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroProyecto" ADD CONSTRAINT "MiembroProyecto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroProyecto" ADD CONSTRAINT "MiembroProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaUsuario" ADD CONSTRAINT "HistoriaUsuario_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaUsuario" ADD CONSTRAINT "HistoriaUsuario_versionActualId_fkey" FOREIGN KEY ("versionActualId") REFERENCES "HistoriaUsuarioVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaUsuarioVersion" ADD CONSTRAINT "HistoriaUsuarioVersion_historiaId_fkey" FOREIGN KEY ("historiaId") REFERENCES "HistoriaUsuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaUsuarioVersion" ADD CONSTRAINT "HistoriaUsuarioVersion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_actividadPadreId_fkey" FOREIGN KEY ("actividadPadreId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_versionActualId_fkey" FOREIGN KEY ("versionActualId") REFERENCES "ActividadVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadVersion" ADD CONSTRAINT "ActividadVersion_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActividadVersion" ADD CONSTRAINT "ActividadVersion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConexionActividad" ADD CONSTRAINT "ConexionActividad_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConexionActividad" ADD CONSTRAINT "ConexionActividad_actividadOrigenId_fkey" FOREIGN KEY ("actividadOrigenId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConexionActividad" ADD CONSTRAINT "ConexionActividad_actividadDestinoId_fkey" FOREIGN KEY ("actividadDestinoId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionProyecto" ADD CONSTRAINT "VersionProyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionProyecto" ADD CONSTRAINT "VersionProyecto_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionProyectoItem" ADD CONSTRAINT "VersionProyectoItem_versionProyectoId_fkey" FOREIGN KEY ("versionProyectoId") REFERENCES "VersionProyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionProyectoItem" ADD CONSTRAINT "VersionProyectoItem_historiaUsuarioVersionId_fkey" FOREIGN KEY ("historiaUsuarioVersionId") REFERENCES "HistoriaUsuarioVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VersionProyectoItem" ADD CONSTRAINT "VersionProyectoItem_actividadVersionId_fkey" FOREIGN KEY ("actividadVersionId") REFERENCES "ActividadVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
