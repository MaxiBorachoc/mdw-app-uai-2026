import { describe, expect, it } from "vitest";
import { contieneTexto } from "./utils";

describe("contieneTexto", () => {
  it("no distingue mayúsculas ni tildes", () => {
    expect(contieneTexto("Registrar Pedido", "pedido")).toBe(true);
    expect(contieneTexto("Gestión de stock", "gestion")).toBe(true);
    expect(contieneTexto("Gestion de stock", "GESTIÓN")).toBe(true);
  });

  it("una búsqueda vacía o con espacios coincide con todo", () => {
    expect(contieneTexto("Lo que sea", "")).toBe(true);
    expect(contieneTexto("Lo que sea", "   ")).toBe(true);
  });

  it("no coincide si el texto no está", () => {
    expect(contieneTexto("Registrar pedido", "factura")).toBe(false);
  });
});
