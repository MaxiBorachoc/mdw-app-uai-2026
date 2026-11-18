import { expect, test } from "@playwright/test";
import { crearProyectoFinalizado, prismaE2E } from "./db";
import { USUARIOS_E2E } from "./entorno";
import { contextoAutenticado } from "./sesiones";

test("dos reaperturas simultáneas dejan una sola versión en desarrollo", async ({ browser }) => {
  const proyectoId = await crearProyectoFinalizado();
  const contexto = await contextoAutenticado(browser, USUARIOS_E2E.owner);

  try {
    const [primera, segunda] = await Promise.all([
      contexto.request.post(`/api/proyectos/${proyectoId}/reabrir`),
      contexto.request.post(`/api/proyectos/${proyectoId}/reabrir`),
    ]);

    expect([primera.status(), segunda.status()].sort((a, b) => a - b)).toEqual([200, 409]);

    const [abiertas, proyecto] = await Promise.all([
      prismaE2E.versionProyecto.count({ where: { proyectoId, estado: "EN_DESARROLLO" } }),
      prismaE2E.proyecto.findUniqueOrThrow({ where: { id: proyectoId }, select: { estado: true } }),
    ]);

    expect(abiertas).toBe(1);
    expect(proyecto.estado).toBe("EN_PROCESO");
  } finally {
    await contexto.close();
  }
});
