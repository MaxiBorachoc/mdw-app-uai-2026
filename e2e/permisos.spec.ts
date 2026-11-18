import { expect, test } from "@playwright/test";
import { crearProyectoDePermisos } from "./db";
import { USUARIOS_E2E } from "./entorno";
import { contextoAutenticado } from "./sesiones";

const cambiosVacios = { historias: [], actividades: [], conexiones: [], carriles: [] };

test.describe("permisos del servidor", () => {
  test("sin sesión recibe 401", async ({ request }) => {
    const proyectoId = await crearProyectoDePermisos();
    const respuesta = await request.get(`/api/proyectos/${proyectoId}`);
    expect(respuesta.status()).toBe(401);
  });

  test("un usuario ajeno recibe 404", async ({ browser }) => {
    const proyectoId = await crearProyectoDePermisos();
    const contexto = await contextoAutenticado(browser, USUARIOS_E2E.externo);
    try {
      const respuesta = await contexto.request.get(`/api/proyectos/${proyectoId}`);
      expect(respuesta.status()).toBe(404);
    } finally {
      await contexto.close();
    }
  });

  test("READER no puede confirmar cambios", async ({ browser }) => {
    const proyectoId = await crearProyectoDePermisos();
    const contexto = await contextoAutenticado(browser, USUARIOS_E2E.reader);
    try {
      const respuesta = await contexto.request.post(`/api/proyectos/${proyectoId}/cambios`, {
        data: cambiosVacios,
      });
      expect(respuesta.status()).toBe(403);
    } finally {
      await contexto.close();
    }
  });

  test("EDITOR no puede administrar colaboradores", async ({ browser }) => {
    const proyectoId = await crearProyectoDePermisos();
    const contexto = await contextoAutenticado(browser, USUARIOS_E2E.editor);
    try {
      const respuesta = await contexto.request.post(`/api/proyectos/${proyectoId}/miembros`, {
        data: { email: USUARIOS_E2E.externo.email, rol: "READER" },
      });
      expect(respuesta.status()).toBe(403);
    } finally {
      await contexto.close();
    }
  });

  test("EDITOR no puede finalizar el proyecto", async ({ browser }) => {
    const proyectoId = await crearProyectoDePermisos();
    const contexto = await contextoAutenticado(browser, USUARIOS_E2E.editor);
    try {
      const respuesta = await contexto.request.post(`/api/proyectos/${proyectoId}/finalizar`, { data: {} });
      expect(respuesta.status()).toBe(403);
    } finally {
      await contexto.close();
    }
  });
});
