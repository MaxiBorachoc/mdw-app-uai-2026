import { describe, expect, it } from "vitest";
import { aplicarCambios, motivoFlechaNoPermitida, nombreNodo, type Actividad, type Cambios, type Estado } from "./documentacion";
import { cambiosSchema } from "./schemas/cambios";

// Un diagrama D con la actividad A, un nodo inicial I, una decisión X y un final F.
const nodo = (id: string, padreId: string | null, tipo: Actividad["tipo"] = "ACTIVIDAD"): Actividad => ({
  id,
  numeroVersion: 1,
  eliminado: false,
  tipo,
  nombre: tipo === "ACTIVIDAD" ? id : "",
  documentacion: "",
  padreId,
  posicionX: padreId === null ? null : 0,
  posicionY: padreId === null ? null : 0,
  historiaIds: [],
});
const base = (): Estado => ({
  historias: [],
  actividades: [nodo("D", null), nodo("A", "D"), nodo("I", "D", "INICIAL"), nodo("X", "D", "DECISION"), nodo("F", "D", "FINAL_ACTIVIDAD")],
  conexiones: [],
});
const sinCambios = (): Cambios => ({ historias: [], actividades: [], conexiones: [] });
const ids = (tipo: string, temporal: string) => `${tipo.toLowerCase()}-${temporal.slice(6)}`;
const flecha = (id: string, origenId: string, destinoId: string, guarda = "") => ({ id, base: null, eliminado: false, origenId, destinoId, guarda });
const conFlecha = (origenId: string, destinoId: string) => {
  const cambios = sinCambios();
  cambios.conexiones.push(flecha("nuevo-f", origenId, destinoId));
  return aplicarCambios(base(), cambios, ids);
};
const motivo = (r: ReturnType<typeof aplicarCambios>) => (r.ok ? null : r.elementos[0]?.motivo);

describe("nodos de control (H16)", () => {
  it("se crean dentro de un diagrama y se conectan con actividades", () => {
    const cambios = sinCambios();
    cambios.actividades.push({ ...nodo("nuevo-b", "D", "BIFURCACION"), base: null });
    cambios.conexiones.push(flecha("nuevo-1", "I", "A"), flecha("nuevo-2", "A", "nuevo-b"), flecha("nuevo-3", "X", "F", "pago aprobado"));
    const r = aplicarCambios(base(), cambios, ids);
    expect(r.ok && r.conexiones.find((c) => c.guarda === "pago aprobado")).toBeTruthy();
  });

  it("caso de error: a un nodo inicial no le entran flechas", () => {
    expect(motivo(conFlecha("A", "I"))).toBe("A un nodo inicial no le entran flechas");
  });

  it("caso de error: de un nodo final no salen flechas (de actividad ni de flujo)", () => {
    expect(motivo(conFlecha("F", "A"))).toBe("De un nodo final no salen flechas");
    expect(motivoFlechaNoPermitida({ id: "f", tipo: "FINAL_FLUJO" }, { id: "a", tipo: "ACTIVIDAD" })).toBe("De un nodo final no salen flechas");
  });

  it("caso de error: un nodo de control no tiene flecha hacia sí mismo; una actividad sí puede", () => {
    expect(motivo(conFlecha("X", "X"))).toBe("Un nodo de control no puede tener una flecha hacia sí mismo");
    expect(conFlecha("A", "A").ok).toBe(true);
  });

  it("no se validan el resto de las reglas de UML: dos iniciales y una decisión con una sola salida", () => {
    const cambios = sinCambios();
    cambios.actividades.push({ ...nodo("nuevo-i2", "D", "INICIAL"), base: null });
    cambios.conexiones.push(flecha("nuevo-1", "X", "A"));
    expect(aplicarCambios(base(), cambios, ids).ok).toBe(true);
  });

  it("caso de error: el tipo de un nodo no cambia", () => {
    const cambios = sinCambios();
    cambios.actividades.push({ ...nodo("X", "D", "BIFURCACION"), base: 1 });
    expect(motivo(aplicarCambios(base(), cambios, ids))).toBe("El tipo de un nodo no cambia");
  });

  it("caso de error: un nodo de control no tiene diagrama interno", () => {
    const cambios = sinCambios();
    cambios.actividades.push({ ...nodo("nuevo-h", "X"), base: null });
    expect(motivo(aplicarCambios(base(), cambios, ids))).toBe("Un nodo de control no tiene diagrama interno");
  });

  it("una guarda nueva sobre una flecha existente genera una revisión", () => {
    const estado = base();
    estado.conexiones.push({ id: "f1", numeroVersion: 1, eliminado: false, origenId: "X", destinoId: "A", guarda: "" });
    const cambios = sinCambios();
    cambios.conexiones.push({ ...flecha("f1", "X", "A", "sí"), base: 1 });
    const r = aplicarCambios(estado, cambios, ids);
    expect(r.ok && r.conexiones[0]?.numeroVersion).toBe(2);
  });

  it("un nodo de control se nombra por su tipo", () => {
    expect(nombreNodo(nodo("X", "D", "DECISION"))).toBe("Decisión");
    expect(nombreNodo(nodo("A", "D"))).toBe("A");
  });
});

describe("validación de la forma de un nodo y una guarda (H16)", () => {
  const cambio = (extra: Record<string, unknown>) =>
    cambiosSchema.safeParse({ historias: [], conexiones: [], actividades: [{ ...nodo("nuevo-n", "D"), base: null, ...extra }] });

  it("caso de error: una actividad sin nombre", () => {
    expect(cambio({ nombre: "" }).success).toBe(false);
  });

  it("un nodo de control sin nombre está bien; con nombre, no", () => {
    expect(cambio({ tipo: "DECISION", nombre: "" }).success).toBe(true);
    expect(cambio({ tipo: "DECISION", nombre: "¿Pagó?" }).success).toBe(false);
  });

  it("caso de error: un nodo de control fuera de un diagrama", () => {
    expect(cambio({ tipo: "INICIAL", nombre: "", padreId: null, posicionX: null, posicionY: null }).success).toBe(false);
  });

  it("caso de error: una guarda de más de 100 caracteres", () => {
    const r = cambiosSchema.safeParse({ historias: [], actividades: [], conexiones: [{ ...flecha("nuevo-f", "A", "B"), guarda: "x".repeat(101) }] });
    expect(r.success).toBe(false);
  });
});
