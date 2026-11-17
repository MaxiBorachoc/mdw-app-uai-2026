/**
 * Datos de ejemplo para desarrollo.
 *
 * Correr con: npm run db:seed
 *
 * Por qué existe: para que los cuatro integrantes del equipo trabajen contra los
 * mismos datos y para poder mostrar el sistema sin cargar todo a mano. Debe poder
 * correrse varias veces sin romper (por eso usamos upsert e ids fijos).
 *
 * Muestra el versionado por build (docs/spec.md, sección 6):
 *   - Build 1, cerrado como 1.0.0: una historia, un diagrama con dos actividades
 *     y una flecha entre ellas.
 *   - Build 2, en desarrollo: la actividad A se movió y se asoció a la historia,
 *     y se agregó una flecha de B a A (un ciclo).
 * Al alternar entre los dos builds en el selector de versión se ve la diferencia.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.usuario.upsert({
    where: { email: "admin@ejemplo.com" },
    update: {},
    create: {
      email: "admin@ejemplo.com",
      nombre: "Admin de ejemplo",
    },
  });

  const proyecto = await prisma.proyecto.upsert({
    where: { id: "proyecto-ejemplo" },
    update: {},
    create: {
      id: "proyecto-ejemplo",
      nombre: "Proyecto de ejemplo",
      descripcion: "Datos de ejemplo para probar el sistema.",
      problemaNegocio: "La documentación del equipo se pierde o se pisa entre una entrega y la siguiente.",
      objetivo: "Tener la documentación de cada entrega versionada y consultable.",
      limitesExclusiones: ["No incluye la gestión del código fuente."],
      fechaInicio: new Date("2026-08-10T00:00:00Z"),
      fechaFinEstimada: new Date("2026-11-24T00:00:00Z"),
      ownerId: admin.id,
      miembros: {
        connectOrCreate: {
          where: { usuarioId_proyectoId: { usuarioId: admin.id, proyectoId: "proyecto-ejemplo" } },
          create: { usuarioId: admin.id, rol: "OWNER", estado: "ACEPTADA" },
        },
      },
    },
  });

  // H14: dos entregables planificados; la versión 1.0.0 corresponde al primero.
  const entregable1 = await prisma.entregable.upsert({
    where: { id: "entregable-ejemplo-1" },
    update: {},
    create: {
      id: "entregable-ejemplo-1",
      nombre: "Primera entrega",
      descripcion: "Historias y diagrama del proceso principal.",
      fechaEstimada: new Date("2026-11-17T00:00:00Z"),
      proyectoId: proyecto.id,
    },
  });
  await prisma.entregable.upsert({
    where: { id: "entregable-ejemplo-2" },
    update: {},
    create: {
      id: "entregable-ejemplo-2",
      nombre: "Entrega final",
      fechaEstimada: new Date("2026-11-24T00:00:00Z"),
      proyectoId: proyecto.id,
    },
  });

  const build1 = await prisma.versionProyecto.upsert({
    where: { id: "build-ejemplo-1" },
    update: {},
    create: {
      id: "build-ejemplo-1",
      orden: 1,
      estado: "CERRADA",
      numeroVersion: 1,
      numeroBuild: 0,
      numeroPatch: 0,
      nombre: "Primera versión de ejemplo",
      descripcion: "Cierre de ejemplo para probar la consulta de una versión cerrada.",
      cerradaEl: new Date(),
      entregableId: entregable1.id,
      proyectoId: proyecto.id,
    },
  });
  const build2 = await prisma.versionProyecto.upsert({
    where: { id: "build-ejemplo-2" },
    update: {},
    create: { id: "build-ejemplo-2", orden: 2, estado: "EN_DESARROLLO", proyectoId: proyecto.id },
  });

  const comun = (versionProyectoId: string) => ({ versionProyectoId, autorId: admin.id });

  // Build 1: la historia, el diagrama, sus dos actividades y la flecha A -> B.
  await prisma.historiaUsuario.upsert({
    where: { id: "historia-ejemplo" },
    update: {},
    create: { id: "historia-ejemplo", proyectoId: proyecto.id },
  });
  await prisma.historiaUsuarioVersion.upsert({
    where: { id: "historia-ejemplo-v1" },
    update: {},
    create: {
      id: "historia-ejemplo-v1",
      historiaId: "historia-ejemplo",
      numeroVersion: 1,
      titulo: "Historia de ejemplo",
      descripcion: "Como usuario quiero ver datos de ejemplo para probar el sistema.",
      criteriosAceptacion: ["Se ve la historia en la barra lateral", "Tiene al menos una revisión"],
      ...comun(build1.id),
    },
  });

  for (const id of ["diagrama-ejemplo", "actividad-ejemplo-a", "actividad-ejemplo-b"]) {
    await prisma.actividad.upsert({ where: { id }, update: {}, create: { id, proyectoId: proyecto.id } });
  }
  await prisma.actividadVersion.upsert({
    where: { id: "diagrama-ejemplo-v1" },
    update: {},
    create: {
      id: "diagrama-ejemplo-v1",
      actividadId: "diagrama-ejemplo",
      numeroVersion: 1,
      nombre: "Proceso de ejemplo",
      documentacion: "Diagrama de ejemplo con dos pasos.",
      ...comun(build1.id),
    },
  });
  await prisma.actividadVersion.upsert({
    where: { id: "actividad-ejemplo-a-v1" },
    update: {},
    create: {
      id: "actividad-ejemplo-a-v1",
      actividadId: "actividad-ejemplo-a",
      numeroVersion: 1,
      nombre: "Actividad A de ejemplo",
      documentacion: "Primer paso del flujo de ejemplo.",
      actividadPadreId: "diagrama-ejemplo",
      posicionX: 40,
      posicionY: 40,
      ...comun(build1.id),
    },
  });
  await prisma.actividadVersion.upsert({
    where: { id: "actividad-ejemplo-b-v1" },
    update: {},
    create: {
      id: "actividad-ejemplo-b-v1",
      actividadId: "actividad-ejemplo-b",
      numeroVersion: 1,
      nombre: "Actividad B de ejemplo",
      documentacion: "Segundo paso del flujo de ejemplo.",
      actividadPadreId: "diagrama-ejemplo",
      posicionX: 320,
      posicionY: 40,
      ...comun(build1.id),
    },
  });

  await prisma.conexionActividad.upsert({
    where: { id: "flecha-ejemplo-a-b" },
    update: {},
    create: { id: "flecha-ejemplo-a-b", proyectoId: proyecto.id },
  });
  await prisma.conexionActividadVersion.upsert({
    where: { id: "flecha-ejemplo-a-b-v1" },
    update: {},
    create: {
      id: "flecha-ejemplo-a-b-v1",
      conexionId: "flecha-ejemplo-a-b",
      numeroVersion: 1,
      actividadOrigenId: "actividad-ejemplo-a",
      actividadDestinoId: "actividad-ejemplo-b",
      ...comun(build1.id),
    },
  });

  // Build 2 (en desarrollo): A se mueve y se asocia a la historia; flecha B -> A.
  await prisma.actividadVersion.upsert({
    where: { id: "actividad-ejemplo-a-v2" },
    update: {},
    create: {
      id: "actividad-ejemplo-a-v2",
      actividadId: "actividad-ejemplo-a",
      numeroVersion: 2,
      nombre: "Actividad A de ejemplo",
      documentacion: "Primer paso del flujo de ejemplo.",
      actividadPadreId: "diagrama-ejemplo",
      posicionX: 40,
      posicionY: 200,
      historias: { create: { historiaId: "historia-ejemplo" } },
      ...comun(build2.id),
    },
  });

  await prisma.conexionActividad.upsert({
    where: { id: "flecha-ejemplo-b-a" },
    update: {},
    create: { id: "flecha-ejemplo-b-a", proyectoId: proyecto.id },
  });
  await prisma.conexionActividadVersion.upsert({
    where: { id: "flecha-ejemplo-b-a-v1" },
    update: {},
    create: {
      id: "flecha-ejemplo-b-a-v1",
      conexionId: "flecha-ejemplo-b-a",
      numeroVersion: 1,
      actividadOrigenId: "actividad-ejemplo-b",
      actividadDestinoId: "actividad-ejemplo-a",
      ...comun(build2.id),
    },
  });

  console.log("Seed completo.", { admin: admin.email, proyecto: proyecto.nombre });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
