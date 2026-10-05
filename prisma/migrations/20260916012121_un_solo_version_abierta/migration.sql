-- Regla de negocio: como maximo una VersionProyecto "EN_DESARROLLO" por proyecto.
-- Prisma no soporta indices unicos parciales en schema.prisma, asi que se agrega
-- a mano. Sin esto, la unicidad de la version abierta depende solo del codigo en
-- lib/db (asegurarVersionAbierta), que queda como la primera linea de defensa.
CREATE UNIQUE INDEX "VersionProyecto_una_abierta_por_proyecto"
  ON "VersionProyecto" ("proyectoId")
  WHERE "estado" = 'EN_DESARROLLO';
