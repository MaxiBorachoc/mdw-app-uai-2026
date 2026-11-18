import { expect, test } from "@playwright/test";
import { aceptarEditorYLector, prismaE2E } from "./db";
import { USUARIOS_E2E } from "./entorno";
import { contextoAutenticado } from "./sesiones";

function fechaDentroDe(dias: number) {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

test("OWNER prepara el proyecto, EDITOR versiona y READER consulta la versión cerrada", async ({ browser }, testInfo) => {
  const sufijo = `${Date.now()}-${testInfo.retry}`;
  const nombreProyecto = `Proyecto E2E ${sufijo}`;
  const entregable = `Entrega E2E ${sufijo}`;
  const tituloHistoria = `Historia E2E ${sufijo}`;
  const descripcionHistoria = "Como integrante, quiero consultar una historia versionada para recuperar una entrega anterior.";

  const contextoOwner = await contextoAutenticado(browser, USUARIOS_E2E.owner);
  const owner = await contextoOwner.newPage();

  try {
    await test.step("OWNER crea el proyecto desde la interfaz", async () => {
      await owner.goto("/proyectos");
      await owner.getByLabel("Nombre del proyecto").fill(nombreProyecto);
      await owner.getByLabel("Descripción (opcional)").fill("Proyecto creado por la prueba E2E del flujo principal.");
      await owner.getByRole("button", { name: "Crear proyecto" }).click();
      await expect(owner.getByText(nombreProyecto)).toBeVisible();
    });

    await expect
      .poll(async () => {
        const proyecto = await prismaE2E.proyecto.findFirst({
          where: { nombre: nombreProyecto, ownerId: USUARIOS_E2E.owner.id },
          select: { id: true },
        });
        return proyecto?.id ?? null;
      })
      .not.toBeNull();

    const proyecto = await prismaE2E.proyecto.findFirstOrThrow({
      where: { nombre: nombreProyecto, ownerId: USUARIOS_E2E.owner.id },
      select: { id: true },
    });
    const proyectoId = proyecto.id;

    await aceptarEditorYLector(proyectoId);

    await test.step("OWNER define el proyecto y crea un entregable", async () => {
      const tarjetaProyecto = owner
        .getByRole("listitem")
        .filter({ hasText: nombreProyecto });

      await expect(tarjetaProyecto).toHaveCount(1);
      await tarjetaProyecto.getByRole("link", { name: "Ver proyecto" }).click();
      await expect(owner).toHaveURL(new RegExp(`/proyectos/${proyectoId}$`));

      await owner.getByRole("button", { name: "Editar" }).first().click();
      await owner.getByLabel("Problema de negocio").fill("La documentación cambia entre entregas y debe conservarse el historial.");
      await owner.getByLabel("Objetivo del proyecto").fill("Mantener documentación versionada y trazable.");
      await owner.getByRole("button", { name: "Guardar información" }).click();
      await expect(owner.getByText("Mantener documentación versionada y trazable.")).toBeVisible();

      await owner.getByRole("button", { name: "Nuevo entregable" }).click();

      const formularioEntregable = owner.locator("form").filter({
        has: owner.getByRole("button", { name: "Crear entregable", exact: true }),
      });

      await expect(formularioEntregable).toHaveCount(1);
      await formularioEntregable.getByLabel("Nombre", { exact: true }).fill(entregable);
      await formularioEntregable
        .getByLabel("Fecha estimada de entrega", { exact: true })
        .fill(fechaDentroDe(7));
      await formularioEntregable
        .getByRole("button", { name: "Crear entregable", exact: true })
        .click();
      await expect(owner.getByText(entregable)).toBeVisible();
    });

    const contextoEditor = await contextoAutenticado(browser, USUARIOS_E2E.editor);
    const editor = await contextoEditor.newPage();
    try {
      await test.step("EDITOR ve un error de negocio al intentar cerrar un build sin cambios", async () => {
        await editor.goto(`/proyectos/${proyectoId}`);
        await editor.getByLabel(/Versión que estás viendo:/).click();
        await editor.getByRole("button", { name: "Cerrar la versión en desarrollo…" }).click();
        const selectorEntregable = editor.getByLabel("Entregable al que corresponde");
        const valorEntregable = await selectorEntregable.locator("option").filter({ hasText: entregable }).getAttribute("value");
        if (!valorEntregable) throw new Error("No se encontró el entregable creado en el selector de cierre");
        await selectorEntregable.selectOption(valorEntregable);
        await editor.getByRole("button", { name: "Cerrar versión", exact: true }).click();
        await expect(editor.getByText(/no tiene cambios/i)).toBeVisible();
        await editor.getByRole("button", { name: "Cancelar" }).click();
      });

      await test.step("EDITOR crea una historia y confirma el borrador", async () => {
        await editor.getByRole("button", { name: "Nueva historia" }).click();
        await editor.getByRole("textbox", { name: "Título", exact: true }).fill(tituloHistoria);
        await editor.getByRole("textbox", { name: "Descripción", exact: true }).fill(descripcionHistoria);
        await editor.getByRole("textbox", { name: "Criterio 1", exact: true }).fill("La historia aparece igual al consultar la versión cerrada.");
        await editor.getByRole("button", { name: "Confirmar cambios" }).click();
        await expect(editor.getByRole("button", { name: "Confirmar cambios" })).toBeDisabled();
      });

      await test.step("EDITOR cierra la versión documentada", async () => {
        await editor.getByLabel(/Versión que estás viendo:/).click();
        await editor.getByRole("button", { name: "Cerrar la versión en desarrollo…" }).click();
        const selectorEntregable = editor.getByLabel("Entregable al que corresponde");
        const valorEntregable = await selectorEntregable.locator("option").filter({ hasText: entregable }).getAttribute("value");
        if (!valorEntregable) throw new Error("No se encontró el entregable creado en el selector de cierre");
        await selectorEntregable.selectOption(valorEntregable);
        await editor.getByRole("button", { name: "Cerrar versión", exact: true }).click();

        await editor.getByLabel(/Versión que estás viendo:/).click();
        await expect(editor.getByRole("link", { name: /Versión \d+\.\d+\.\d+/ }).first()).toBeVisible();
      });
    } finally {
      await contextoEditor.close();
    }

    const contextoReader = await contextoAutenticado(browser, USUARIOS_E2E.reader);
    const reader = await contextoReader.newPage();
    try {
      await test.step("READER consulta la versión cerrada en solo lectura", async () => {
        await reader.goto(`/proyectos/${proyectoId}`);
        await expect(reader).toHaveURL(new RegExp(`/proyectos/${proyectoId}$`));

        await reader.getByLabel(/Versión que estás viendo:/).click();

        const versionCerrada = reader
          .getByRole("link", { name: /^Versión \d+\.\d+\.\d+/ })
          .first();

        await expect(versionCerrada).toBeVisible();

        await Promise.all([
          reader.waitForURL(
            (url) =>
              url.pathname === `/proyectos/${proyectoId}` &&
              url.searchParams.has("build"),
          ),
          versionCerrada.click(),
        ]);

        await expect(
          reader.getByLabel(/^Versión que estás viendo: \d+\.\d+\.\d+\./),
        ).toBeVisible();

        const historiaCerrada = reader.getByRole("button", {
          name: tituloHistoria,
          exact: true,
        });

        await expect(historiaCerrada).toBeVisible();
        await historiaCerrada.click();

        await expect(
          reader.getByRole("heading", {
            name: tituloHistoria,
            exact: true,
          }),
        ).toBeVisible();

        await expect(
          reader.getByRole("textbox", {
            name: "Descripción",
            exact: true,
          }),
        ).toHaveValue(descripcionHistoria);

        await expect(
          reader.getByRole("button", {
            name: "Confirmar cambios",
            exact: true,
          }),
        ).toHaveCount(0);
      });
    } finally {
      await contextoReader.close();
    }
  } finally {
    await contextoOwner.close();
  }
});
