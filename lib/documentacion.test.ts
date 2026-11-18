import { describe, expect, it } from "vitest";
import {
  aplicarCambios,
  descendientes,
  puedeMoverA,
  ultimaRevisionHasta,
  vigentes,
  type Actividad,
  type Cambios,
  type Conexion,
  type Estado,
  type Historia,
} from "./documentacion";

const historia = (id: string, titulo: string, extra: Partial<Historia> = {}): Historia => ({
  id,
  numeroVersion: 1,
  eliminado: false,
  titulo,
  descripcion: "d",
  criteriosAceptacion: ["c"],
  ...extra,
});

const actividad = (id: string, padreId: string | null, extra: Partial<Actividad> = {}): Actividad => ({
  id,
  numeroVersion: 1,
  eliminado: false,
  tipo: "ACTIVIDAD",
  nombre: id,
  documentacion: "",
  padreId,
  posicionX: padreId === null ? null : 0,
  posicionY: padreId === null ? null : 0,
  historiaIds: [],
  ...extra,
});

const flecha = (id: string, origenId: string, destinoId: string, extra: Partial<Conexion> = {}): Conexion => ({
  id,
  numeroVersion: 1,
  eliminado: false,
  origenId,
  destinoId,
  guarda: "",
  ...extra,
});

// Un diagrama D con A y B adentro (A -> B), y C adentro de A.
const base = (): Estado => ({
  historias: [historia("h1", "Pagar factura")],
  actividades: [actividad("D", null), actividad("A", "D"), actividad("B", "D"), actividad("C", "A")],
  conexiones: [flecha("f1", "A", "B")],
  carriles: [],
});

const sinCambios = (): Cambios => ({ historias: [], actividades: [], conexiones: [], carriles: [] });
const ids = (tipo: string, temporal: string) => `${tipo.toLowerCase()}-${temporal.slice(6)}`;
const editar = (a: Actividad, cambios: Partial<Actividad> = {}) => ({ ...a, base: a.numeroVersion, ...cambios });
const buscar = <T extends { id: string }>(lista: T[], id: string): T => {
  const elemento = lista.find((e) => e.id === id);
  if (!elemento) throw new Error(`No existe ${id}`);
  return elemento;
};
const modificar = <T extends { id: string }>(lista: T[], id: string, extra: Partial<T>) => {
  lista[lista.findIndex((e) => e.id === id)] = { ...buscar(lista, id), ...extra };
};

describe("reconstrucción de un build", () => {
  const revisiones = [
    { id: "x", numeroVersion: 1, ordenBuild: 1 },
    { id: "x", numeroVersion: 2, ordenBuild: 2 },
    { id: "y", numeroVersion: 1, ordenBuild: 1 },
    { id: "z", numeroVersion: 1, ordenBuild: 3 },
  ];

  it("toma la última revisión del build pedido o de uno anterior", () => {
    const build2 = ultimaRevisionHasta(revisiones, 2);
    expect(build2.find((r) => r.id === "x")?.numeroVersion).toBe(2);
  });

  it("un elemento que nadie tocó en el build aparece con la revisión que traía", () => {
    expect(ultimaRevisionHasta(revisiones, 2).some((r) => r.id === "y")).toBe(true);
  });

  it("no muestra lo que se creó en un build posterior", () => {
    expect(ultimaRevisionHasta(revisiones, 1).map((r) => r.id).sort()).toEqual(["x", "y"]);
    expect(ultimaRevisionHasta(revisiones, 1).find((r) => r.id === "x")?.numeroVersion).toBe(1);
  });

  it("el build en desarrollo (null) toma la última de todas", () => {
    expect(ultimaRevisionHasta(revisiones, null).map((r) => r.id).sort()).toEqual(["x", "y", "z"]);
  });
});

describe("lo que se muestra de un estado", () => {
  it("oculta lo eliminado y las actividades internas de una actividad eliminada", () => {
    const e = base();
    modificar(e.actividades, "A", { eliminado: true }); // A
    const v = vigentes(e);
    expect(v.actividades.map((a) => a.id).sort()).toEqual(["B", "D"]);
  });

  it("oculta una flecha si uno de sus extremos no está vigente", () => {
    const e = base();
    modificar(e.actividades, "B", { eliminado: true }); // B
    expect(vigentes(e).conexiones).toEqual([]);
  });

  it("deja de mostrar la asociación a una historia eliminada", () => {
    const e = base();
    modificar(e.actividades, "A", { historiaIds: ["h1"] });
    modificar(e.historias, "h1", { eliminado: true });
    expect(vigentes(e).actividades.find((a) => a.id === "A")?.historiaIds).toEqual([]);
  });
});

describe("jerarquía de actividades (H7)", () => {
  it("lista las actividades internas en todos los niveles", () => {
    expect(descendientes(base().actividades, "D").sort()).toEqual(["A", "B", "C"]);
  });

  it("permite mover a otro padre, a un ascendente o a ninguno", () => {
    const a = base().actividades;
    expect(puedeMoverA(a, "C", "B")).toBe(true);
    expect(puedeMoverA(a, "C", "D")).toBe(true);
    expect(puedeMoverA(a, "A", null)).toBe(true);
  });

  it("no permite mover a sí misma ni a una interna", () => {
    const a = base().actividades;
    expect(puedeMoverA(a, "A", "A")).toBe(false);
    expect(puedeMoverA(a, "A", "C")).toBe(false);
    expect(puedeMoverA(a, "D", "C")).toBe(false);
  });
});

describe("confirmar cambios: historias (H3, H4)", () => {
  it("crea una historia nueva con su versión 1 y un id definitivo", () => {
    const cambios = sinCambios();
    cambios.historias.push({ id: "nuevo-1", base: null, eliminado: false, titulo: "Otra", descripcion: "d", criteriosAceptacion: ["c"] });
    const r = aplicarCambios(base(), cambios, ids);
    expect(r.ok && r.historias).toEqual([expect.objectContaining({ id: "historia-1", numeroVersion: 1, titulo: "Otra" })]);
  });

  it("rechaza un título repetido sin importar mayúsculas ni espacios al borde", () => {
    const cambios = sinCambios();
    cambios.historias.push({ id: "nuevo-1", base: null, eliminado: false, titulo: "  pagar FACTURA ", descripcion: "d", criteriosAceptacion: ["c"] });
    const r = aplicarCambios(base(), cambios, ids);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.motivo).toBe("INVALIDO");
  });

  it("borde: acentos y espacios internos hacen distintos dos títulos", () => {
    const cambios = sinCambios();
    cambios.historias.push({ id: "nuevo-1", base: null, eliminado: false, titulo: "Pagar  factura", descripcion: "d", criteriosAceptacion: ["c"] });
    cambios.historias.push({ id: "nuevo-2", base: null, eliminado: false, titulo: "Pagár factura", descripcion: "d", criteriosAceptacion: ["c"] });
    expect(aplicarCambios(base(), cambios, ids).ok).toBe(true);
  });

  it("guardar sin cambios no crea una revisión", () => {
    const cambios = sinCambios();
    cambios.historias.push({ ...historia("h1", "Pagar factura"), base: 1 });
    const r = aplicarCambios(base(), cambios, ids);
    expect(r.ok && r.historias).toEqual([]);
  });

  it("rechaza todo si otro usuario ya confirmó una versión más nueva (conflicto)", () => {
    const e = base();
    modificar(e.historias, "h1", { numeroVersion: 2 });
    const cambios = sinCambios();
    cambios.historias.push({ ...historia("h1", "Nuevo título"), base: 1 });
    const r = aplicarCambios(e, cambios, ids);
    expect(!r.ok && r.motivo).toBe("CONFLICTO");
  });

  it("eliminar una historia crea una revisión marcada eliminado y no toca las actividades", () => {
    const cambios = sinCambios();
    cambios.historias.push({ ...historia("h1", "Pagar factura"), base: 1, eliminado: true });
    const r = aplicarCambios(base(), cambios, ids);
    expect(r.ok && r.historias).toEqual([expect.objectContaining({ id: "h1", numeroVersion: 2, eliminado: true })]);
    expect(r.ok && r.actividades).toEqual([]);
  });
});

describe("confirmar cambios: actividades (H5, H6, H7)", () => {
  it("mover una actividad crea una revisión con la nueva posición", () => {
    const e = base();
    const cambios = sinCambios();
    cambios.actividades.push(editar(buscar(e.actividades, "B"), { posicionX: 120, posicionY: 80 }));
    const r = aplicarCambios(e, cambios, ids);
    expect(r.ok && r.actividades).toEqual([expect.objectContaining({ id: "B", numeroVersion: 2, posicionX: 120 })]);
  });

  it("eliminar una actividad elimina sus internas y las flechas que tocan a cualquiera de ellas", () => {
    const e = base();
    const cambios = sinCambios();
    cambios.actividades.push(editar(buscar(e.actividades, "A"), { eliminado: true })); // A
    const r = aplicarCambios(e, cambios, ids);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.actividades.map((a) => a.id).sort()).toEqual(["A", "C"]);
    expect(r.actividades.every((a) => a.eliminado)).toBe(true);
    expect(r.conexiones).toEqual([expect.objectContaining({ id: "f1", eliminado: true, numeroVersion: 2 })]);
  });

  it("mover una actividad de padre elimina sus flechas en el mismo cambio", () => {
    const e = base();
    const cambios = sinCambios();
    cambios.actividades.push(editar(buscar(e.actividades, "B"), { padreId: "A" })); // B adentro de A
    const r = aplicarCambios(e, cambios, ids);
    expect(r.ok && r.conexiones).toEqual([expect.objectContaining({ id: "f1", eliminado: true })]);
  });

  it("rechaza mover una actividad adentro de una interna suya", () => {
    const e = base();
    const cambios = sinCambios();
    cambios.actividades.push(editar(buscar(e.actividades, "A"), { padreId: "C" })); // A adentro de C
    const r = aplicarCambios(e, cambios, ids);
    expect(!r.ok && r.motivo).toBe("INVALIDO");
  });

  it("un diagrama (sin padre) queda sin posición", () => {
    const cambios = sinCambios();
    cambios.actividades.push({ ...actividad("nuevo-1", null), base: null, posicionX: 10, posicionY: 10 });
    const r = aplicarCambios(base(), cambios, ids);
    expect(r.ok && r.actividades[0]).toEqual(expect.objectContaining({ padreId: null, posicionX: null, posicionY: null }));
  });

  it("asocia una actividad a una historia creada en el mismo borrador", () => {
    const e = base();
    const cambios = sinCambios();
    cambios.historias.push({ id: "nuevo-h", base: null, eliminado: false, titulo: "Cobrar", descripcion: "d", criteriosAceptacion: ["c"] });
    cambios.actividades.push(editar(buscar(e.actividades, "A"), { historiaIds: ["h1", "nuevo-h"] }));
    const r = aplicarCambios(e, cambios, ids);
    expect(r.ok && r.actividades[0]?.historiaIds).toEqual(["h1", "historia-h"]);
  });

  it("rechaza una asociación nueva a una historia que otro eliminó (conflicto)", () => {
    const e = base();
    modificar(e.historias, "h1", { eliminado: true, numeroVersion: 2 });
    const cambios = sinCambios();
    cambios.actividades.push(editar(buscar(e.actividades, "A"), { historiaIds: ["h1"] }));
    expect(!aplicarCambios(e, cambios, ids).ok).toBe(true);
  });

  it("borde: una asociación vieja a una historia eliminada se descarta sin error", () => {
    const e = base();
    modificar(e.actividades, "A", { historiaIds: ["h1"] });
    modificar(e.historias, "h1", { eliminado: true, numeroVersion: 2 });
    const cambios = sinCambios();
    cambios.actividades.push(editar(buscar(e.actividades, "A"), { nombre: "A renombrada" }));
    const r = aplicarCambios(e, cambios, ids);
    expect(r.ok && r.actividades[0]?.historiaIds).toEqual([]);
  });
});

describe("confirmar cambios: flechas (H10)", () => {
  const nueva = (id: string, origenId: string, destinoId: string) => ({ id, base: null, eliminado: false, origenId, destinoId, guarda: "" });

  it("permite una flecha de una actividad hacia sí misma y los ciclos", () => {
    const cambios = sinCambios();
    cambios.conexiones.push(nueva("nuevo-1", "A", "A"), nueva("nuevo-2", "B", "A"));
    expect(aplicarCambios(base(), cambios, ids).ok).toBe(true);
  });

  it("rechaza una flecha duplicada (mismo origen y destino)", () => {
    const cambios = sinCambios();
    cambios.conexiones.push(nueva("nuevo-1", "A", "B"));
    const r = aplicarCambios(base(), cambios, ids);
    expect(!r.ok && r.motivo).toBe("INVALIDO");
  });

  it("borde: se puede volver a crear una flecha que se había eliminado", () => {
    const e = base();
    modificar(e.conexiones, "f1", { eliminado: true, numeroVersion: 2 });
    const cambios = sinCambios();
    cambios.conexiones.push(nueva("nuevo-1", "A", "B"));
    expect(aplicarCambios(e, cambios, ids).ok).toBe(true);
  });

  it("rechaza unir actividades de distinto diagrama", () => {
    const cambios = sinCambios();
    cambios.conexiones.push(nueva("nuevo-1", "B", "C")); // B en D, C en A
    const r = aplicarCambios(base(), cambios, ids);
    expect(!r.ok && r.motivo).toBe("INVALIDO");
  });

  it("rechaza conectar diagramas (actividades sin padre)", () => {
    const e = base();
    e.actividades.push(actividad("E", null));
    const cambios = sinCambios();
    cambios.conexiones.push(nueva("nuevo-1", "D", "E"));
    expect(aplicarCambios(e, cambios, ids).ok).toBe(false);
  });
});
