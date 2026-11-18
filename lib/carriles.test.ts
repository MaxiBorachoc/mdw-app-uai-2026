import { describe, expect, it } from "vitest";
import { cambiosParaConfirmar, crearBorrador, crearCarril, editarCarril, eliminarActividad, eliminarCarril, vista } from "./borrador";
import { aplicarCambios, nombreCarrilLibre, vigentes, type Actividad, type Cambios, type Carril, type Estado, type TipoNodo } from "./documentacion";
import { cambiosSchema } from "./schemas/cambios";

// H17: carriles de un diagrama.
const nodo = (id: string, padreId: string | null, tipo: TipoNodo = "ACTIVIDAD"): Actividad => ({
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
const carril = (id: string, diagramaId: string, nombre: string, posicionX = 0): Carril => ({
  id,
  numeroVersion: 1,
  eliminado: false,
  diagramaId,
  nombre,
  posicionX,
  ancho: 300,
});
// Dos diagramas D y E; A dentro de D, X (decisión) dentro de D. D tiene el carril "Ventas".
const base = (): Estado => ({
  historias: [],
  actividades: [nodo("D", null), nodo("E", null), nodo("A", "D"), nodo("X", "D", "DECISION")],
  conexiones: [],
  carriles: [carril("c1", "D", "Ventas")],
});
const sinCambios = (): Cambios => ({ historias: [], actividades: [], conexiones: [], carriles: [] });
const ids = (tipo: string, temporal: string) => `${tipo.toLowerCase()}-${temporal.slice(6)}`;
const nuevo = (id: string, diagramaId: string, nombre: string) => ({
  id,
  base: null,
  eliminado: false,
  diagramaId,
  nombre,
  posicionX: 300,
  ancho: 300,
});
const confirmar = (cambios: Partial<Cambios>, estado = base()) => aplicarCambios(estado, { ...sinCambios(), ...cambios }, ids);

describe("carriles (H17)", () => {
  it("crear un carril genera su versión 1", () => {
    const r = confirmar({ carriles: [nuevo("nuevo-c2", "D", "Compras")] });
    expect(r.ok && r.carriles).toEqual([expect.objectContaining({ id: "carril-c2", numeroVersion: 1, nombre: "Compras", diagramaId: "D" })]);
  });

  it("el nombre no se repite en el mismo diagrama, sin distinguir mayúsculas ni espacios al borde", () => {
    const r = confirmar({ carriles: [nuevo("nuevo-c2", "D", "  ventas ")] });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.elementos[0]?.motivo).toBe("Ya existe otro carril con ese nombre en el diagrama");
  });

  it("el mismo nombre en otro diagrama sí se permite", () => {
    expect(confirmar({ carriles: [nuevo("nuevo-c2", "E", "Ventas")] }).ok).toBe(true);
  });

  it("el nombre de un carril eliminado se puede volver a usar", () => {
    const estado = base();
    estado.carriles[0] = { ...estado.carriles[0]!, eliminado: true };
    expect(confirmar({ carriles: [nuevo("nuevo-c2", "D", "Ventas")] }, estado).ok).toBe(true);
  });

  it("un nodo de control no tiene carriles", () => {
    const r = confirmar({ carriles: [nuevo("nuevo-c2", "X", "Ventas")] });
    expect(!r.ok && r.elementos[0]?.motivo).toBe("Un nodo de control no tiene diagrama interno");
  });

  it("un carril no cambia de diagrama", () => {
    const r = confirmar({ carriles: [{ ...carril("c1", "E", "Ventas"), base: 1 }] });
    expect(!r.ok && r.elementos[0]?.motivo).toBe("Un carril no cambia de diagrama");
  });

  it("si otro eliminó el diagrama, el carril nuevo es un conflicto", () => {
    const estado = base();
    estado.actividades = estado.actividades.map((a) => (a.id === "E" ? { ...a, eliminado: true } : a));
    const r = confirmar({ carriles: [nuevo("nuevo-c2", "E", "Ventas")] }, estado);
    expect(!r.ok && r.motivo).toBe("CONFLICTO");
  });

  it("mover o ensanchar un carril no genera revisiones de nodos", () => {
    const r = confirmar({ carriles: [{ ...carril("c1", "D", "Ventas"), base: 1, posicionX: 500, ancho: 640 }] });
    expect(r.ok && r.carriles[0]).toMatchObject({ numeroVersion: 2, posicionX: 500, ancho: 640 });
    expect(r.ok && r.actividades).toEqual([]);
  });

  it("eliminar el diagrama elimina sus carriles en el mismo cambio", () => {
    const r = confirmar({ actividades: [{ ...nodo("D", null), base: 1, eliminado: true }] });
    expect(r.ok && r.carriles).toEqual([expect.objectContaining({ id: "c1", eliminado: true, numeroVersion: 2 })]);
  });

  it("un carril de un diagrama eliminado no se muestra", () => {
    const estado = base();
    estado.actividades = estado.actividades.map((a) => (a.id === "D" ? { ...a, eliminado: true } : a));
    expect(vigentes(estado).carriles).toEqual([]);
  });

  it("el nombre por defecto es el primer \"Carril N\" libre", () => {
    expect(nombreCarrilLibre([])).toBe("Carril 1");
    expect(nombreCarrilLibre(["carril 1", "Carril 3"])).toBe("Carril 2");
  });

  it("el ancho tiene un mínimo y un máximo", () => {
    const con = (ancho: number) => cambiosSchema.safeParse({ ...sinCambios(), carriles: [{ ...nuevo("nuevo-c2", "D", "Compras"), ancho }] }).success;
    expect(con(120)).toBe(true);
    expect(con(119)).toBe(false);
    expect(con(2000)).toBe(true);
    expect(con(2001)).toBe(false);
  });
});

describe("carriles en el borrador (H17)", () => {
  it("crear, editar y eliminar llegan a lo que se confirma; eliminar un carril no toca los nodos", () => {
    let b = crearBorrador(base());
    b = crearCarril(b, "nuevo-c2", { diagramaId: "D", nombre: "Compras", posicionX: 300, ancho: 300 });
    b = editarCarril(b, "c1", { ancho: 420 });
    b = eliminarCarril(b, "c1");
    const c = cambiosParaConfirmar(b);
    expect(c.carriles.map((x) => [x.id, x.eliminado])).toEqual([
      ["c1", true],
      ["nuevo-c2", false],
    ]);
    expect(c.actividades).toEqual([]);
  });

  it("eliminar la actividad elimina los carriles de su diagrama", () => {
    const b = eliminarActividad(crearBorrador(base()), "D");
    expect(vista(b).carriles).toEqual([]);
    expect(cambiosParaConfirmar(b).carriles).toEqual([expect.objectContaining({ id: "c1", eliminado: true })]);
  });
});
