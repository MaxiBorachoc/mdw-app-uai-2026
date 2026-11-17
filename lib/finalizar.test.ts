import { describe, expect, it } from "vitest";
import { decidirFinalizacion } from "./versiones-proyecto";

describe("finalizar el proyecto (H15)", () => {
  it("con cambios en el build y los datos del cierre: se cierra y se finaliza", () => {
    expect(decidirFinalizacion({ tieneCambios: true, hayVersionesCerradas: true, vinoElCierre: true })).toEqual({
      accion: "CERRAR_Y_FINALIZAR",
    });
  });

  it("con cambios pero sin los datos del cierre: se piden (aunque no haya versiones cerradas)", () => {
    expect(decidirFinalizacion({ tieneCambios: true, hayVersionesCerradas: false, vinoElCierre: false })).toEqual({
      accion: "RECHAZAR",
      motivo: "CIERRE_REQUERIDO",
    });
  });

  it("sin cambios y con versiones cerradas: el build vacío se descarta (aunque vengan datos de cierre)", () => {
    expect(decidirFinalizacion({ tieneCambios: false, hayVersionesCerradas: true, vinoElCierre: true })).toEqual({
      accion: "DESCARTAR_Y_FINALIZAR",
    });
  });

  it("caso de error: sin cambios y sin ninguna versión cerrada no hay nada que finalizar", () => {
    expect(decidirFinalizacion({ tieneCambios: false, hayVersionesCerradas: false, vinoElCierre: false })).toEqual({
      accion: "RECHAZAR",
      motivo: "NADA_QUE_FINALIZAR",
    });
  });
});
