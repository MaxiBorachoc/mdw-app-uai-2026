import { describe, expect, it } from "vitest";
import {
  puedeQuitarMiembro,
  validarAltaDeMiembro,
  validarBajaDeMiembro,
  validarCambioDeRol,
  validarRespuestaAInvitacion,
} from "./miembros-proyecto";

describe("validarAltaDeMiembro", () => {
  it("acepta a un usuario existente sin invitacion previa", () => {
    expect(validarAltaDeMiembro({ id: "beto" }, "owner", null)).toEqual({ ok: true });
  });

  it("rechaza un email sin usuario", () => {
    expect(validarAltaDeMiembro(null, "owner", null)).toEqual({
      ok: false,
      motivo: "USUARIO_INEXISTENTE",
    });
  });

  it("rechaza que el owner se agregue a si mismo", () => {
    expect(validarAltaDeMiembro({ id: "owner" }, "owner", null)).toEqual({
      ok: false,
      motivo: "ES_OWNER",
    });
  });

  it("rechaza a quien ya tiene una invitacion pendiente", () => {
    expect(validarAltaDeMiembro({ id: "ana" }, "owner", { estado: "PENDIENTE" })).toEqual({
      ok: false,
      motivo: "YA_ES_MIEMBRO",
    });
  });

  it("rechaza a quien ya tiene una invitacion aceptada", () => {
    expect(validarAltaDeMiembro({ id: "ana" }, "owner", { estado: "ACEPTADA" })).toEqual({
      ok: false,
      motivo: "YA_ES_MIEMBRO",
    });
  });

  it("borde: acepta re-invitar a quien rechazo antes", () => {
    expect(validarAltaDeMiembro({ id: "ana" }, "owner", { estado: "RECHAZADA" })).toEqual({
      ok: true,
    });
  });
});

describe("validarBajaDeMiembro", () => {
  it("acepta a un colaborador en cualquier estado", () => {
    expect(validarBajaDeMiembro({ usuarioId: "ana", rol: "EDITOR", estado: "ACEPTADA" })).toEqual({
      ok: true,
    });
    expect(validarBajaDeMiembro({ usuarioId: "ana", rol: "EDITOR", estado: "PENDIENTE" })).toEqual({
      ok: true,
    });
    expect(validarBajaDeMiembro({ usuarioId: "ana", rol: "EDITOR", estado: "RECHAZADA" })).toEqual({
      ok: true,
    });
  });

  it("rechaza a alguien que no es colaborador", () => {
    expect(validarBajaDeMiembro(null)).toEqual({ ok: false, motivo: "NO_ES_MIEMBRO" });
  });

  it("borde: el owner no se toca", () => {
    expect(validarBajaDeMiembro({ usuarioId: "owner", rol: "OWNER", estado: "ACEPTADA" })).toEqual({
      ok: false,
      motivo: "ES_OWNER",
    });
  });
});

describe("validarCambioDeRol", () => {
  it("acepta a un colaborador con invitacion aceptada", () => {
    expect(validarCambioDeRol({ usuarioId: "ana", rol: "EDITOR", estado: "ACEPTADA" })).toEqual({
      ok: true,
    });
  });

  it("rechaza a alguien que no es colaborador", () => {
    expect(validarCambioDeRol(null)).toEqual({ ok: false, motivo: "NO_ES_MIEMBRO" });
  });

  it("rechaza al owner", () => {
    expect(validarCambioDeRol({ usuarioId: "owner", rol: "OWNER", estado: "ACEPTADA" })).toEqual({
      ok: false,
      motivo: "ES_OWNER",
    });
  });

  it("borde: rechaza cambiar el rol de una invitacion pendiente", () => {
    expect(validarCambioDeRol({ usuarioId: "ana", rol: "EDITOR", estado: "PENDIENTE" })).toEqual({
      ok: false,
      motivo: "INVITACION_NO_ACEPTADA",
    });
  });

  it("borde: rechaza cambiar el rol de una invitacion rechazada", () => {
    expect(validarCambioDeRol({ usuarioId: "ana", rol: "EDITOR", estado: "RECHAZADA" })).toEqual({
      ok: false,
      motivo: "INVITACION_NO_ACEPTADA",
    });
  });
});

describe("validarRespuestaAInvitacion", () => {
  it("acepta responder una invitacion pendiente", () => {
    expect(validarRespuestaAInvitacion({ estado: "PENDIENTE" })).toEqual({ ok: true });
  });

  it("rechaza si no hay invitacion", () => {
    expect(validarRespuestaAInvitacion(null)).toEqual({ ok: false, motivo: "NO_ES_MIEMBRO" });
  });

  it("borde: rechaza responder una invitacion ya aceptada", () => {
    expect(validarRespuestaAInvitacion({ estado: "ACEPTADA" })).toEqual({
      ok: false,
      motivo: "YA_RESPONDIDA",
    });
  });

  it("borde: rechaza responder una invitacion ya rechazada", () => {
    expect(validarRespuestaAInvitacion({ estado: "RECHAZADA" })).toEqual({
      ok: false,
      motivo: "YA_RESPONDIDA",
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
