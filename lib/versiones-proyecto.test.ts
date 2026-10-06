import { describe, expect, it } from "vitest";
import { compararVersiones, formatearVersion, validarCierreDeVersion } from "./versiones-proyecto";

const v = (numeroVersion: number, numeroBuild: number, numeroPatch: number) => ({
  numeroVersion,
  numeroBuild,
  numeroPatch,
});

describe("compararVersiones", () => {
  it("ordena por Version, luego Build, luego Patch", () => {
    expect(compararVersiones(v(1, 2, 9), v(1, 3, 0))).toBeLessThan(0);
    expect(compararVersiones(v(2, 9, 5), v(1, 3, 0))).toBeGreaterThan(0);
    expect(compararVersiones(v(3, 1, 3), v(2, 9, 5))).toBeGreaterThan(0);
    expect(compararVersiones(v(1, 0, 1), v(1, 0, 1))).toBe(0);
  });
});

describe("validarCierreDeVersion", () => {
  it("acepta la primera version cerrada del proyecto", () => {
    expect(validarCierreDeVersion(v(0, 0, 1), [])).toEqual({ ok: true });
  });

  it("acepta una version por encima de la ultima cerrada", () => {
    expect(validarCierreDeVersion(v(1, 2, 10), [v(1, 2, 9)])).toEqual({ ok: true });
  });

  it("acepta saltear numeros (del build 2 al 5)", () => {
    expect(validarCierreDeVersion(v(1, 5, 0), [v(1, 2, 9)])).toEqual({ ok: true });
  });

  it("rechaza una combinacion ya cerrada como DUPLICADA", () => {
    expect(validarCierreDeVersion(v(1, 2, 9), [v(1, 0, 0), v(1, 2, 9)])).toEqual({
      ok: false,
      motivo: "DUPLICADA",
      version: v(1, 2, 9),
    });
  });

  it("rechaza una version por debajo de la ultima como NO_ASCENDENTE e informa cual es", () => {
    expect(validarCierreDeVersion(v(1, 2, 9), [v(1, 3, 0)])).toEqual({
      ok: false,
      motivo: "NO_ASCENDENTE",
      ultimaCerrada: v(1, 3, 0),
    });
  });

  it("borde: un Patch mas alto no alcanza si el Build es menor", () => {
    const veredicto = validarCierreDeVersion(v(1, 2, 99), [v(1, 3, 0)]);
    expect(veredicto).toMatchObject({ ok: false, motivo: "NO_ASCENDENTE" });
  });

  it("borde: la ultima cerrada se calcula sin importar el orden de la lista", () => {
    const cerradas = [v(2, 0, 0), v(1, 0, 0), v(1, 5, 0)];
    expect(validarCierreDeVersion(v(1, 9, 9), cerradas)).toEqual({
      ok: false,
      motivo: "NO_ASCENDENTE",
      ultimaCerrada: v(2, 0, 0),
    });
  });

  it("rechaza cerrar una version en desarrollo sin cambios", () => {
    expect(validarCierreDeVersion(v(1, 0, 0), [], false)).toEqual({
      ok: false,
      motivo: "SIN_CAMBIOS",
    });
  });
});

describe("formatearVersion", () => {
  it("devuelve Version.Build.Patch", () => {
    expect(formatearVersion(v(1, 2, 9))).toBe("1.2.9");
  });
});
