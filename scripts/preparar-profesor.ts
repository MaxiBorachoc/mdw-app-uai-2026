import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL_DOCENTE = "dario.sjs@gmail.com";
const PROYECTO_ID = "proyecto-parcial-docente";

async function main() {
  const docente = await prisma.usuario.upsert({
    where: { email: EMAIL_DOCENTE },
    update: { nombre: "Darío Maranés" },
    create: {
      email: EMAIL_DOCENTE,
      nombre: "Darío Maranés",
    },
  });

  const proyecto = await prisma.proyecto.upsert({
    where: { id: PROYECTO_ID },
    update: {
      nombre: "Proyecto de prueba - Parcial I",
      descripcion: "Proyecto preparado para la evaluación del docente.",
      ownerId: docente.id,
    },
    create: {
      id: PROYECTO_ID,
      nombre: "Proyecto de prueba - Parcial I",
      descripcion: "Proyecto preparado para la evaluación del docente.",
      ownerId: docente.id,
    },
  });

  await prisma.miembroProyecto.upsert({
    where: {
      usuarioId_proyectoId: {
        usuarioId: docente.id,
        proyectoId: proyecto.id,
      },
    },
    update: {
      rol: "OWNER",
      estado: "ACEPTADA",
    },
    create: {
      usuarioId: docente.id,
      proyectoId: proyecto.id,
      rol: "OWNER",
      estado: "ACEPTADA",
    },
  });

  const versionAbierta = await prisma.versionProyecto.findFirst({
    where: {
      proyectoId: proyecto.id,
      estado: "EN_DESARROLLO",
    },
    select: { id: true },
  });

  if (!versionAbierta) {
    await prisma.versionProyecto.create({
      data: {
        proyectoId: proyecto.id,
        estado: "EN_DESARROLLO",
      },
    });
  }

  console.log("Cuenta del docente preparada:", {
    email: EMAIL_DOCENTE,
    rol: "OWNER",
    proyecto: proyecto.nombre,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
