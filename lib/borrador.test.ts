import { describe, expect, it } from "vitest";
import {
  alcanceDeEliminacion,
  cambiarPadre,
  cambiosParaConfirmar,
  crearActividad,
  crearBorrador,
  crearConexion,
  crearHistoria,
  editarActividad,
  eliminarActividad,
  hayCambios,
  rebasar,
  vista,
} from "./borrador";
import type { Estado } from "./documentacion";

// Un diagrama D con A y B adentro (A -> B), y C adentro de A.
const confirmado = (): Estado => ({
  historias: [{ id: "h1", numeroVersion: 1, eliminado: false, titulo: "Pagar", descripcion: "d", criteriosAceptacion: ["c"] }],
  actividades: [
    { id: "D", numeroVersion: 1, eliminado: false, tipo: "ACTIVIDAD", nombre: "D", documentacion: "", padreId: null, posicionX: null, posicionY: null, historiaIds: [] },
    { id: "A", numeroVersion: 3, eliminado: false, tipo: "ACTIVIDAD", nombre: "A", documentacion: "", padreId: "D", posicionX: 0, posicionY: 0, historiaIds: [] },
    { id: "B", numeroVersion: 1, eliminado: false, tipo: "ACTIVIDAD", nombre: "B", documentacion: "", padreId: "D", posicionX: 200, posicionY: 0, historiaIds: [] },
    { id: "C", numeroVersion: 1, eliminado: false, tipo: "ACTIVIDAD", nombre: "C", documentacion: "", padreId: "A", posicionX: 0, posicionY: 0, historiaIds: [] },
  ],
  conexiones: [{ id: "f1", numeroVersion: 1, eliminado: false, origenId: "A", destinoId: "B", guarda: "" }],
});

describe("borrador (H12)", () => {
  it("sin ediciones no hay cambios para confirmar", () => {
    expect(hayCambios(crearBorrador(confirmado()))).toBe(false);
  });

  it("arrastrar varias veces manda un solo cambio, con la versión sobre la que se editó", () => {
    let b = crearBorrador(confirmado());
    b = editarActividad(b, "A", { posicionX: 10, posicionY: 10 });
    b = editarActividad(b, "A", { posicionX: 50, posicionY: 80 });
    expect(cambiosParaConfirmar(b).actividades).toEqual([
      expect.objectContaining({ id: "A", base: 3, posicionX: 50, posicionY: 80 }),
    ]);
  });

  it("volver al valor original no deja cambios pendientes", () => {
    let b = crearBorrador(confirmado());
    b = editarActividad(b, "A", { nombre: "Otro" });
    b = editarActividad(b, "A", { nombre: "A" });
    expect(hayCambios(b)).toBe(false);
  });

  it("lo creado y eliminado dentro del mismo borrador no se manda", () => {
    let b = crearBorrador(confirmado());
    b = crearActividad(b, "nuevo-x", { nombre: "X", padreId: "D", posicionX: 0, posicionY: 0 });
    b = eliminarActividad(b, "nuevo-x");
    expect(hayCambios(b)).toBe(false);
  });

  it("eliminar una actividad marca sus internas y sus flechas, y avisa el alcance", () => {
    let b = crearBorrador(confirmado());
    expect(alcanceDeEliminacion(b, "A")).toEqual({ actividades: 1, flechas: 1 });
    b = eliminarActividad(b, "A");
    expect(vista(b).actividades.map((a) => a.id).sort()).toEqual(["B", "D"]);
    expect(vista(b).conexiones).toEqual([]);
  });

  it("mover una actividad de padre quita sus flechas", () => {
    const b = cambiarPadre(crearBorrador(confirmado()), "B", "A", { x: 0, y: 0 });
    expect(cambiosParaConfirmar(b).conexiones).toEqual([expect.objectContaining({ id: "f1", eliminado: true })]);
  });

  it("no duplica una flecha: devuelve la existente para resaltarla", () => {
    const { borrador, existente } = crearConexion(crearBorrador(confirmado()), "nuevo-f", "A", "B");
    expect(existente).toBe("f1");
    expect(hayCambios(borrador)).toBe(false);
  });

  it("una historia nueva se manda sin versión base", () => {
    const b = crearHistoria(crearBorrador(confirmado()), "nuevo-h", { titulo: "Cobrar", descripcion: "d", criteriosAceptacion: ["c"] });
    expect(cambiosParaConfirmar(b).historias).toEqual([expect.objectContaining({ id: "nuevo-h", base: null })]);
  });
});

describe("rebasar el borrador sobre lo que confirmaron otros (H12)", () => {
  it("conserva los cambios propios y descarta los que chocan", () => {
    let b = crearBorrador(confirmado());
    b = editarActividad(b, "A", { nombre: "A mía" });
    b = editarActividad(b, "B", { nombre: "B mía" });
    // Otro usuario confirmó una versión nueva de B mientras tanto.
    const nuevo = confirmado();
    nuevo.actividades = nuevo.actividades.map((a) => (a.id === "B" ? { ...a, numeroVersion: 2, nombre: "B de otro" } : a));
    const { borrador, descartados } = rebasar(b, nuevo);
    expect(descartados).toEqual(["B"]);
    expect(vista(borrador).actividades.find((a) => a.id === "A")?.nombre).toBe("A mía");
    expect(vista(borrador).actividades.find((a) => a.id === "B")?.nombre).toBe("B de otro");
    expect(cambiosParaConfirmar(borrador).actividades).toEqual([expect.objectContaining({ id: "A", base: 3 })]);
  });
});
