/**
 * Datos de ejemplo para desarrollo.
 *
 * Correr con: npm run db:seed
 *
 * Por qué existe: para que los cuatro integrantes del equipo trabajen contra los
 * mismos datos y para poder mostrar el sistema sin cargar todo a mano. Debe poder
 * correrse varias veces sin romper (por eso usamos upsert e ids fijos).
 *
 * Cubre el flujo principal completo: historia con su versión, actividad con su
 * versión, una conexión entre actividades, y una versión de proyecto ya cerrada
 * (con sus items congelados) más otra abierta en desarrollo.
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
      ownerId: admin.id,
      miembros: {
        connectOrCreate: {
          where: { usuarioId_proyectoId: { usuarioId: admin.id, proyectoId: "proyecto-ejemplo" } },
          create: { usuarioId: admin.id, rol: "OWNER", estado: "ACEPTADA" },
        },
      },
    },
  });

  // Historia de usuario con su primera version, marcada como la version actual.
  await prisma.historiaUsuario.upsert({
    where: { id: "historia-ejemplo" },
    update: {},
    create: { id: "historia-ejemplo", proyectoId: proyecto.id },
  });
  const historiaVersion = await prisma.historiaUsuarioVersion.upsert({
    where: { id: "historia-ejemplo-v1" },
    update: {},
    create: {
      id: "historia-ejemplo-v1",
      numeroVersion: 1,
      titulo: "Historia de ejemplo",
      descripcion: "Como usuario quiero ver datos de ejemplo para probar el sistema.",
      criteriosAceptacion: ["Se puede ver la historia en el diagrama", "Tiene al menos una version"],
      historiaId: "historia-ejemplo",
      autorId: admin.id,
    },
  });
  await prisma.historiaUsuario.update({
    where: { id: "historia-ejemplo" },
    data: { versionActualId: historiaVersion.id },
  });

  // Dos actividades con su primera version cada una, conectadas entre si.
  await prisma.actividad.upsert({
    where: { id: "actividad-ejemplo-a" },
    update: {},
    create: { id: "actividad-ejemplo-a", proyectoId: proyecto.id, posicionX: 0, posicionY: 0 },
  });
  const actividadVersionA = await prisma.actividadVersion.upsert({
    where: { id: "actividad-ejemplo-a-v1" },
    update: {},
    create: {
      id: "actividad-ejemplo-a-v1",
      numeroVersion: 1,
      nombre: "Actividad A de ejemplo",
      documentacion: "Primer paso del flujo de ejemplo.",
      estado: "COMPLETADA",
      actividadId: "actividad-ejemplo-a",
      autorId: admin.id,
    },
  });
  await prisma.actividad.update({
    where: { id: "actividad-ejemplo-a" },
    data: { versionActualId: actividadVersionA.id },
  });

  await prisma.actividad.upsert({
    where: { id: "actividad-ejemplo-b" },
    update: {},
    create: { id: "actividad-ejemplo-b", proyectoId: proyecto.id, posicionX: 300, posicionY: 0 },
  });
  const actividadVersionB = await prisma.actividadVersion.upsert({
    where: { id: "actividad-ejemplo-b-v1" },
    update: {},
    create: {
      id: "actividad-ejemplo-b-v1",
      numeroVersion: 1,
      nombre: "Actividad B de ejemplo",
      documentacion: "Segundo paso del flujo de ejemplo.",
      estado: "EN_PROGRESO",
      actividadId: "actividad-ejemplo-b",
      autorId: admin.id,
    },
  });
  await prisma.actividad.update({
    where: { id: "actividad-ejemplo-b" },
    data: { versionActualId: actividadVersionB.id },
  });

  await prisma.conexionActividad.upsert({
    where: {
      actividadOrigenId_actividadDestinoId: {
        actividadOrigenId: "actividad-ejemplo-a",
        actividadDestinoId: "actividad-ejemplo-b",
      },
    },
    update: {},
    create: {
      proyectoId: proyecto.id,
      actividadOrigenId: "actividad-ejemplo-a",
      actividadDestinoId: "actividad-ejemplo-b",
    },
  });

  // Version de proyecto ya cerrada, con las versiones actuales de arriba congeladas.
  await prisma.versionProyecto.upsert({
    where: { id: "version-proyecto-ejemplo-cerrada" },
    update: {},
    create: {
      id: "version-proyecto-ejemplo-cerrada",
      estado: "CERRADA",
      numeroVersion: 1,
      numeroBuild: 0,
      numeroPatch: 0,
      nombre: "Primera version de ejemplo",
      descripcion: "Cierre de ejemplo para probar el historial de versiones.",
      cerradaEl: new Date(),
      proyectoId: proyecto.id,
      items: {
        connectOrCreate: [
          {
            where: { id: "version-proyecto-ejemplo-cerrada-item-historia" },
            create: {
              id: "version-proyecto-ejemplo-cerrada-item-historia",
              tipo: "HISTORIA",
              historiaUsuarioVersionId: historiaVersion.id,
            },
          },
          {
            where: { id: "version-proyecto-ejemplo-cerrada-item-actividad-a" },
            create: {
              id: "version-proyecto-ejemplo-cerrada-item-actividad-a",
              tipo: "ACTIVIDAD",
              actividadVersionId: actividadVersionA.id,
            },
          },
          {
            where: { id: "version-proyecto-ejemplo-cerrada-item-actividad-b" },
            create: {
              id: "version-proyecto-ejemplo-cerrada-item-actividad-b",
              tipo: "ACTIVIDAD",
              actividadVersionId: actividadVersionB.id,
            },
          },
        ],
      },
    },
  });

  // Version de proyecto en desarrollo: siempre hay una abierta para seguir editando.
  await prisma.versionProyecto.upsert({
    where: { id: "version-proyecto-ejemplo-en-desarrollo" },
    update: {},
    create: {
      id: "version-proyecto-ejemplo-en-desarrollo",
      estado: "EN_DESARROLLO",
      proyectoId: proyecto.id,
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
