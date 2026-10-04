
import { describe, expect, it } from "vitest";
import { crearNotaSchema } from "./nota";

describe("crearNotaSchema", () => {
  it("acepta una nota válida", () => {
    const resultado = crearNotaSchema.safeParse({
      titulo: "Un título",
      contenido: "Contenido de la nota",
    });

    expect(resultado.success).toBe(true);
  });

  it("rechaza un título demasiado corto", () => {
    const resultado = crearNotaSchema.safeParse({
      titulo: "ab",
      contenido: "Contenido de la nota",
    });

    expect(resultado.success).toBe(false);
  });

  it("rechaza un contenido que es solo espacios", () => {
    const resultado = crearNotaSchema.safeParse({
      titulo: "Un título",
      contenido: "     ",
    });

    expect(resultado.success).toBe(false);
  });
});
