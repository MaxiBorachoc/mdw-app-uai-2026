import { describe, expect, it } from "vitest";
import { estadoEntregable } from "./entregables";
import { entregableSchema } from "./schemas/entregable";
import { definicionProyectoSchema } from "./schemas/proyecto";
import { hoyEnArgentina } from "./utils";

const pendiente = { fechaEstimada: "2026-11-17", entregado: false, fechaEntrega: null };

describe("estado de un entregable (H14, spec seccion 6)", () => {
  it("no entregado y antes de la fecha estimada: pendiente", () => {
    expect(estadoEntregable(pendiente, "2026-11-10")).toBe("PENDIENTE");
  });

  it("borde: el mismo dia de la fecha estimada todavia es pendiente", () => {
    expect(estadoEntregable(pendiente, "2026-11-17")).toBe("PENDIENTE");
  });

  it("no entregado y un dia despues de la fecha estimada: atrasado", () => {
    expect(estadoEntregable(pendiente, "2026-11-18")).toBe("ATRASADO");
  });

  it("entregado el mismo dia de la fecha estimada: a tiempo", () => {
    expect(estadoEntregable({ ...pendiente, entregado: true, fechaEntrega: "2026-11-17" }, "2026-12-01")).toBe(
      "ENTREGADO_A_TIEMPO",
    );
  });

  it("entregado despues de la fecha estimada: con atraso, aunque ya no sea un atraso de hoy", () => {
    expect(estadoEntregable({ ...pendiente, entregado: true, fechaEntrega: "2026-11-20" }, "2026-12-01")).toBe(
      "ENTREGADO_CON_ATRASO",
    );
  });
});

describe("hoy en Argentina", () => {
  it("a las 01:00 UTC todavia es el dia anterior en Argentina (UTC-3)", () => {
    expect(hoyEnArgentina(new Date("2026-11-15T01:00:00Z"))).toBe("2026-11-14");
  });
});

describe("validacion de un entregable (H14)", () => {
  const base = { nombre: "Primera entrega", fechaEstimada: "2026-11-17" };

  it("acepta un entregable sin entregar y le borra la fecha de entrega si vino una", () => {
    const r = entregableSchema.safeParse({ ...base, fechaEntrega: "2026-11-01" });
    expect(r.success && r.data.fechaEntrega).toBe(null);
  });

  it("caso de error: entregado sin fecha de entrega", () => {
    expect(entregableSchema.safeParse({ ...base, entregado: true }).success).toBe(false);
  });

  it("caso de error: fecha de entrega posterior a hoy", () => {
    const r = entregableSchema.safeParse({ ...base, entregado: true, fechaEntrega: "2999-01-01" });
    expect(r.success).toBe(false);
  });

  it("acepta una fecha de entrega posterior a la estimada (entregado con atraso)", () => {
    const r = entregableSchema.safeParse({ ...base, fechaEstimada: "2020-01-01", entregado: true, fechaEntrega: "2020-02-01" });
    expect(r.success).toBe(true);
  });

  it("caso de error: falta la fecha estimada, o no existe en el calendario", () => {
    expect(entregableSchema.safeParse({ nombre: "X" }).success).toBe(false);
    expect(entregableSchema.safeParse({ nombre: "X", fechaEstimada: "2026-02-30" }).success).toBe(false);
  });
});

describe("validacion de la definicion del proyecto (H13)", () => {
  it("solo el nombre es obligatorio", () => {
    const r = definicionProyectoSchema.safeParse({ nombre: "Proyecto" });
    expect(r.success && r.data).toMatchObject({ problemaNegocio: "", limitesExclusiones: [], fechaInicio: null });
  });

  it("caso de error: fecha estimada de fin anterior a la de inicio", () => {
    const r = definicionProyectoSchema.safeParse({ nombre: "P", fechaInicio: "2026-11-10", fechaFinEstimada: "2026-11-09" });
    expect(r.success).toBe(false);
  });

  it("borde: fin el mismo dia que el inicio", () => {
    const r = definicionProyectoSchema.safeParse({ nombre: "P", fechaInicio: "2026-11-10", fechaFinEstimada: "2026-11-10" });
    expect(r.success).toBe(true);
  });

  it("acepta muchos limites y exclusiones (la spec no limita la cantidad)", () => {
    const limites = Array.from({ length: 200 }, (_, i) => `Límite ${i}`);
    expect(definicionProyectoSchema.safeParse({ nombre: "P", limitesExclusiones: limites }).success).toBe(true);
  });

  it("caso de error: un limite vacio", () => {
    expect(definicionProyectoSchema.safeParse({ nombre: "P", limitesExclusiones: ["  "] }).success).toBe(false);
  });
});
