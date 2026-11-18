import { PrismaClient } from "@prisma/client";
import { USUARIOS_E2E } from "./entorno";

export const prismaE2E = new PrismaClient();

export async function aceptarEditorYLector(proyectoId: string) {
  await Promise.all([
    prismaE2E.miembroProyecto.upsert({
      where: { usuarioId_proyectoId: { usuarioId: USUARIOS_E2E.editor.id, proyectoId } },
      update: { rol: "EDITOR", estado: "ACEPTADA" },
      create: { usuarioId: USUARIOS_E2E.editor.id, proyectoId, rol: "EDITOR", estado: "ACEPTADA" },
    }),
    prismaE2E.miembroProyecto.upsert({
      where: { usuarioId_proyectoId: { usuarioId: USUARIOS_E2E.reader.id, proyectoId } },
      update: { rol: "READER", estado: "ACEPTADA" },
      create: { usuarioId: USUARIOS_E2E.reader.id, proyectoId, rol: "READER", estado: "ACEPTADA" },
    }),
  ]);
}

export async function crearProyectoDePermisos() {
  const id = `e2e-permisos-${crypto.randomUUID()}`;
  await prismaE2E.proyecto.create({
    data: {
      id,
      nombre: "Proyecto E2E permisos",
      ownerId: USUARIOS_E2E.owner.id,
      miembros: {
        create: [
          { usuarioId: USUARIOS_E2E.owner.id, rol: "OWNER", estado: "ACEPTADA" },
          { usuarioId: USUARIOS_E2E.editor.id, rol: "EDITOR", estado: "ACEPTADA" },
          { usuarioId: USUARIOS_E2E.reader.id, rol: "READER", estado: "ACEPTADA" },
        ],
      },
      versiones: { create: { orden: 1, estado: "EN_DESARROLLO" } },
    },
  });
  return id;
}

export async function crearProyectoFinalizado() {
  const id = `e2e-concurrencia-${crypto.randomUUID()}`;
  const entregableId = `${id}-entregable`;

  await prismaE2E.proyecto.create({
    data: {
      id,
      nombre: "Proyecto E2E concurrencia",
      estado: "FINALIZADO",
      ownerId: USUARIOS_E2E.owner.id,
      miembros: {
        create: { usuarioId: USUARIOS_E2E.owner.id, rol: "OWNER", estado: "ACEPTADA" },
      },
      entregables: {
        create: {
          id: entregableId,
          nombre: "Entrega cerrada",
          fechaEstimada: new Date("2026-01-01T00:00:00.000Z"),
        },
      },
    },
  });

  await prismaE2E.versionProyecto.create({
    data: {
      proyectoId: id,
      orden: 1,
      estado: "CERRADA",
      numeroVersion: 1,
      numeroBuild: 0,
      numeroPatch: 0,
      nombre: "Versión cerrada E2E",
      cerradaEl: new Date(),
      entregableId,
    },
  });

  return id;
}
