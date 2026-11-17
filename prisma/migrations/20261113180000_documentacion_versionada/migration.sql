-- Documentacion versionada por build (docs/spec.md, secciones 3 y 6).
--
-- Escrita a mano a partir de `prisma migrate diff`, porque el diff generado borraria
-- datos: la posicion y el padre de una actividad pasan de la identidad a la revision,
-- y las flechas pasan a tener revisiones. Cada paso conserva lo que ya habia.

-- 1. Builds ordenados: "orden" correlativo por proyecto, segun la fecha de creacion.
ALTER TABLE "VersionProyecto" ADD COLUMN "orden" INTEGER;

UPDATE "VersionProyecto" v
SET "orden" = o.n
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "proyectoId" ORDER BY "creadoEn", "id") AS n
  FROM "VersionProyecto"
) o
WHERE v."id" = o."id";

-- Todo proyecto tiene exactamente un build en desarrollo (spec, seccion 6). Si alguno
-- quedo sin el (proyectos anteriores a esa regla), se le abre uno al final.
INSERT INTO "VersionProyecto" ("id", "orden", "estado", "creadoEn", "proyectoId")
SELECT gen_random_uuid()::text,
       COALESCE((SELECT MAX(v."orden") FROM "VersionProyecto" v WHERE v."proyectoId" = p."id"), 0) + 1,
       'EN_DESARROLLO', CURRENT_TIMESTAMP, p."id"
FROM "Proyecto" p
WHERE NOT EXISTS (
  SELECT 1 FROM "VersionProyecto" v WHERE v."proyectoId" = p."id" AND v."estado" = 'EN_DESARROLLO'
);

ALTER TABLE "VersionProyecto" ALTER COLUMN "orden" SET NOT NULL;
CREATE UNIQUE INDEX "VersionProyecto_proyectoId_orden_key" ON "VersionProyecto"("proyectoId", "orden");

-- Build al que pertenece un cambio hecho en un momento dado: el ultimo build del
-- proyecto creado hasta ese momento (o el primero, si el cambio es anterior a todos).
CREATE FUNCTION "build_en_fecha"(proyecto TEXT, fecha TIMESTAMP(3)) RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT "id" FROM "VersionProyecto"
      WHERE "proyectoId" = proyecto AND "creadoEn" <= fecha
      ORDER BY "orden" DESC LIMIT 1),
    (SELECT "id" FROM "VersionProyecto" WHERE "proyectoId" = proyecto ORDER BY "orden" ASC LIMIT 1)
  );
$$ LANGUAGE sql STABLE;

-- 2. La foto de cada version cerrada ya no se guarda aparte: sale de las revisiones.
ALTER TABLE "VersionProyectoItem" DROP CONSTRAINT "VersionProyectoItem_versionProyectoId_fkey";
ALTER TABLE "VersionProyectoItem" DROP CONSTRAINT "VersionProyectoItem_historiaUsuarioVersionId_fkey";
ALTER TABLE "VersionProyectoItem" DROP CONSTRAINT "VersionProyectoItem_actividadVersionId_fkey";
DROP TABLE "VersionProyectoItem";
DROP TYPE "TipoVersionProyectoItem";

-- 3. Historias: cada revision guarda su build y si da de baja a la historia.
ALTER TABLE "HistoriaUsuario" DROP CONSTRAINT "HistoriaUsuario_versionActualId_fkey";
DROP INDEX "HistoriaUsuario_versionActualId_key";

ALTER TABLE "HistoriaUsuarioVersion"
  ADD COLUMN "eliminado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "versionProyectoId" TEXT;

UPDATE "HistoriaUsuarioVersion" r
SET "versionProyectoId" = "build_en_fecha"(h."proyectoId", r."creadoEn")
FROM "HistoriaUsuario" h
WHERE h."id" = r."historiaId";

ALTER TABLE "HistoriaUsuarioVersion" ALTER COLUMN "versionProyectoId" SET NOT NULL;
DROP INDEX "HistoriaUsuarioVersion_historiaId_idx";
CREATE INDEX "HistoriaUsuarioVersion_versionProyectoId_idx" ON "HistoriaUsuarioVersion"("versionProyectoId");
ALTER TABLE "HistoriaUsuarioVersion" ADD CONSTRAINT "HistoriaUsuarioVersion_versionProyectoId_fkey"
  FOREIGN KEY ("versionProyectoId") REFERENCES "VersionProyecto"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "HistoriaUsuario" DROP COLUMN "creadoEn", DROP COLUMN "versionActualId";

-- 4. Actividades. Antes, las actividades sin padre eran los nodos de un unico diagrama
-- implicito; ahora una actividad sin padre es un diagrama. Para no perder ese diagrama
-- (ni las flechas entre sus nodos), se crea un "Diagrama principal" por proyecto que
-- tenga actividades sin padre, y esas actividades pasan a ser sus hijas.
ALTER TABLE "Actividad" DROP CONSTRAINT "Actividad_versionActualId_fkey";
ALTER TABLE "Actividad" DROP CONSTRAINT "Actividad_actividadPadreId_fkey";
DROP INDEX "Actividad_versionActualId_key";
DROP INDEX "Actividad_actividadPadreId_idx";

ALTER TABLE "ActividadVersion"
  ADD COLUMN "eliminado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "actividadPadreId" TEXT,
  ADD COLUMN "posicionX" DOUBLE PRECISION,
  ADD COLUMN "posicionY" DOUBLE PRECISION,
  ADD COLUMN "versionProyectoId" TEXT,
  ALTER COLUMN "documentacion" SET DEFAULT '';

-- La actividad ya no tiene estado (spec, H6).
ALTER TABLE "ActividadVersion" DROP COLUMN "estado";
DROP TYPE "EstadoActividad";

CREATE TEMP TABLE "diagrama_principal" ("proyectoId" TEXT PRIMARY KEY, "actividadId" TEXT NOT NULL);

-- Primero los proyectos distintos y despues un id para cada uno (un DISTINCT junto
-- con gen_random_uuid() no deduplicaria, porque cada fila trae un uuid distinto).
INSERT INTO "diagrama_principal" ("proyectoId", "actividadId")
SELECT p."proyectoId", gen_random_uuid()::text
FROM (SELECT DISTINCT a."proyectoId" FROM "Actividad" a WHERE a."actividadPadreId" IS NULL) p;

INSERT INTO "Actividad" ("id", "proyectoId", "posicionX", "posicionY", "creadoEn")
SELECT d."actividadId", d."proyectoId", 0, 0, CURRENT_TIMESTAMP
FROM "diagrama_principal" d;

-- Revisiones existentes: el padre y la posicion que tenia la actividad (las sin padre,
-- adentro del diagrama principal), y el build en el que se escribieron.
UPDATE "ActividadVersion" r
SET "actividadPadreId" = COALESCE(a."actividadPadreId", d."actividadId"),
    "posicionX" = a."posicionX",
    "posicionY" = a."posicionY",
    "versionProyectoId" = "build_en_fecha"(a."proyectoId", r."creadoEn")
FROM "Actividad" a
LEFT JOIN "diagrama_principal" d ON d."proyectoId" = a."proyectoId"
WHERE a."id" = r."actividadId";

-- Version 1 de cada diagrama principal, en el primer build y a nombre del dueño.
INSERT INTO "ActividadVersion"
  ("id", "numeroVersion", "nombre", "documentacion", "creadoEn", "actividadId", "autorId",
   "eliminado", "actividadPadreId", "posicionX", "posicionY", "versionProyectoId")
SELECT gen_random_uuid()::text, 1, 'Diagrama principal', '', CURRENT_TIMESTAMP, d."actividadId", p."ownerId",
       false, NULL, NULL, NULL,
       (SELECT v."id" FROM "VersionProyecto" v WHERE v."proyectoId" = d."proyectoId" ORDER BY v."orden" ASC LIMIT 1)
FROM "diagrama_principal" d
JOIN "Proyecto" p ON p."id" = d."proyectoId";

ALTER TABLE "ActividadVersion" ALTER COLUMN "versionProyectoId" SET NOT NULL;

DROP INDEX "ActividadVersion_actividadId_idx";
CREATE INDEX "ActividadVersion_actividadPadreId_idx" ON "ActividadVersion"("actividadPadreId");
CREATE INDEX "ActividadVersion_versionProyectoId_idx" ON "ActividadVersion"("versionProyectoId");
ALTER TABLE "ActividadVersion" ADD CONSTRAINT "ActividadVersion_actividadPadreId_fkey"
  FOREIGN KEY ("actividadPadreId") REFERENCES "Actividad"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ActividadVersion" ADD CONSTRAINT "ActividadVersion_versionProyectoId_fkey"
  FOREIGN KEY ("versionProyectoId") REFERENCES "VersionProyecto"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 5. Historias asociadas a cada revision de actividad (N-N). Antes no existian.
CREATE TABLE "ActividadVersionHistoria" (
    "actividadVersionId" TEXT NOT NULL,
    "historiaId" TEXT NOT NULL,

    CONSTRAINT "ActividadVersionHistoria_pkey" PRIMARY KEY ("actividadVersionId","historiaId")
);
CREATE INDEX "ActividadVersionHistoria_historiaId_idx" ON "ActividadVersionHistoria"("historiaId");
ALTER TABLE "ActividadVersionHistoria" ADD CONSTRAINT "ActividadVersionHistoria_actividadVersionId_fkey"
  FOREIGN KEY ("actividadVersionId") REFERENCES "ActividadVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActividadVersionHistoria" ADD CONSTRAINT "ActividadVersionHistoria_historiaId_fkey"
  FOREIGN KEY ("historiaId") REFERENCES "HistoriaUsuario"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 6. Flechas versionadas: cada flecha existente recibe su version 1.
CREATE TABLE "ConexionActividadVersion" (
    "id" TEXT NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conexionId" TEXT NOT NULL,
    "actividadOrigenId" TEXT NOT NULL,
    "actividadDestinoId" TEXT NOT NULL,
    "versionProyectoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "ConexionActividadVersion_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ConexionActividadVersion"
  ("id", "numeroVersion", "eliminado", "creadoEn", "conexionId", "actividadOrigenId",
   "actividadDestinoId", "versionProyectoId", "autorId")
SELECT gen_random_uuid()::text, 1, false, c."creadoEn", c."id", c."actividadOrigenId", c."actividadDestinoId",
       "build_en_fecha"(c."proyectoId", c."creadoEn"), p."ownerId"
FROM "ConexionActividad" c
JOIN "Proyecto" p ON p."id" = c."proyectoId";

CREATE UNIQUE INDEX "ConexionActividadVersion_conexionId_numeroVersion_key" ON "ConexionActividadVersion"("conexionId", "numeroVersion");
CREATE INDEX "ConexionActividadVersion_actividadOrigenId_idx" ON "ConexionActividadVersion"("actividadOrigenId");
CREATE INDEX "ConexionActividadVersion_actividadDestinoId_idx" ON "ConexionActividadVersion"("actividadDestinoId");
CREATE INDEX "ConexionActividadVersion_versionProyectoId_idx" ON "ConexionActividadVersion"("versionProyectoId");
CREATE INDEX "ConexionActividadVersion_autorId_idx" ON "ConexionActividadVersion"("autorId");
ALTER TABLE "ConexionActividadVersion" ADD CONSTRAINT "ConexionActividadVersion_conexionId_fkey"
  FOREIGN KEY ("conexionId") REFERENCES "ConexionActividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConexionActividadVersion" ADD CONSTRAINT "ConexionActividadVersion_actividadOrigenId_fkey"
  FOREIGN KEY ("actividadOrigenId") REFERENCES "Actividad"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ConexionActividadVersion" ADD CONSTRAINT "ConexionActividadVersion_actividadDestinoId_fkey"
  FOREIGN KEY ("actividadDestinoId") REFERENCES "Actividad"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ConexionActividadVersion" ADD CONSTRAINT "ConexionActividadVersion_versionProyectoId_fkey"
  FOREIGN KEY ("versionProyectoId") REFERENCES "VersionProyecto"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ConexionActividadVersion" ADD CONSTRAINT "ConexionActividadVersion_autorId_fkey"
  FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. La identidad queda solo con id y proyecto.
ALTER TABLE "ConexionActividad" DROP CONSTRAINT "ConexionActividad_actividadOrigenId_fkey";
ALTER TABLE "ConexionActividad" DROP CONSTRAINT "ConexionActividad_actividadDestinoId_fkey";
DROP INDEX "ConexionActividad_actividadOrigenId_actividadDestinoId_key";
DROP INDEX "ConexionActividad_actividadDestinoId_idx";
ALTER TABLE "ConexionActividad" DROP COLUMN "actividadOrigenId", DROP COLUMN "actividadDestinoId", DROP COLUMN "creadoEn";

ALTER TABLE "Actividad" DROP COLUMN "actividadPadreId", DROP COLUMN "posicionX", DROP COLUMN "posicionY",
  DROP COLUMN "versionActualId", DROP COLUMN "creadoEn";

DROP FUNCTION "build_en_fecha"(TEXT, TIMESTAMP(3));
