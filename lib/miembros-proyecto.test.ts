import { describe, expect, it } from "vitest";
import {
  puedeQuitarMiembro,
  validarAltaDeMiembro,
  validarCambioSobreMiembro,
} from "./miembros-proyecto";

describe("validarAltaDeMiembro", () => {
  const miembros = [{ usuarioId: "owner" }, { usuarioId: "ana" }];

  it("acepta a un usuario existente que todavia no colabora", () => {
    expect(validarAltaDeMiembro({ id: "beto" }, "owner", miembros)).toEqual({ ok: true });
  });

  it("rechaza un email sin usuario", () => {
    expect(validarAltaDeMiembro(null, "owner", miembros)).toEqual({
      ok: false,
      motivo: "USUARIO_INEXISTENTE",
    });
  });

  it("rechaza que el owner se agregue a si mismo", () => {
    expect(validarAltaDeMiembro({ id: "owner" }, "owner", miembros)).toEqual({
      ok: false,
      motivo: "ES_OWNER",
    });
  });

  it("rechaza a quien ya es colaborador", () => {
    expect(validarAltaDeMiembro({ id: "ana" }, "owner", miembros)).toEqual({
      ok: false,
      motivo: "YA_ES_MIEMBRO",
    });
  });

  it("borde: un usuario inexistente se informa antes que cualquier otro motivo", () => {
    expect(validarAltaDeMiembro(null, "owner", [])).toMatchObject({ motivo: "USUARIO_INEXISTENTE" });
  });

  it("borde: en un proyecto sin colaboradores se puede agregar al primero", () => {
    expect(validarAltaDeMiembro({ id: "ana" }, "owner", [{ usuarioId: "owner" }])).toEqual({
      ok: true,
    });
  });
});

describe("validarCambioSobreMiembro", () => {
  it("acepta a un colaborador editor o reader", () => {
    expect(validarCambioSobreMiembro({ usuarioId: "ana", rol: "EDITOR" })).toEqual({ ok: true });
    expect(validarCambioSobreMiembro({ usuarioId: "beto", rol: "READER" })).toEqual({ ok: true });
  });

  it("rechaza a alguien que no es colaborador", () => {
    expect(validarCambioSobreMiembro(null)).toEqual({ ok: false, motivo: "NO_ES_MIEMBRO" });
  });

  it("borde: el owner no se toca", () => {
    expect(validarCambioSobreMiembro({ usuarioId: "owner", rol: "OWNER" })).toEqual({
      ok: false,
      motivo: "ES_OWNER",
    });
  });
});

describe("puedeQuitarMiembro", () => {
  it("el owner puede quitar a cualquiera", () => {
    expect(puedeQuitarMiembro({ usuarioId: "owner", rol: "OWNER" }, "ana")).toBe(true);
  });

  it("un colaborador puede quitarse a si mismo", () => {
    expect(puedeQuitarMiembro({ usuarioId: "ana", rol: "READER" }, "ana")).toBe(true);
  });

  it("borde: un colaborador no puede quitar a otro", () => {
    expect(puedeQuitarMiembro({ usuarioId: "ana", rol: "EDITOR" }, "beto")).toBe(false);
  });
});
