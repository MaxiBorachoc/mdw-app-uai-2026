import { describe, expect, it } from "vitest";
import { acercarVista, arrastrarCarril, desplazarVista, ESCALA_MAXIMA, ESCALA_MINIMA, limitarVista, MARGEN_VISIBLE, VISTA_INICIAL } from "./lienzo";

const m = { anchoVisible: 800, altoVisible: 480, anchoDiagrama: 1100, altoDiagrama: 520 };

describe("vista del lienzo (H5)", () => {
  it("desplazar mueve la vista lo que se arrastró", () => {
    expect(desplazarVista(VISTA_INICIAL, -30, 20, m)).toEqual({ x: -30, y: 20, escala: 1 });
  });

  it("al desplazar siempre queda a la vista una parte del diagrama", () => {
    const lejos = desplazarVista(VISTA_INICIAL, -5000, 5000, m);
    expect(lejos.x).toBe(MARGEN_VISIBLE - 1100);
    expect(lejos.y).toBe(480 - MARGEN_VISIBLE);
  });

  it("la rueda hacia arriba acerca y hacia abajo aleja", () => {
    expect(acercarVista(VISTA_INICIAL, -100, 0, 0, m).escala).toBeGreaterThan(1);
    expect(acercarVista(VISTA_INICIAL, 100, 0, 0, m).escala).toBeLessThan(1);
  });

  it("acercar deja fijo el punto del diagrama que está bajo el cursor", () => {
    const v = { x: -40, y: 10, escala: 1 };
    const cx = 300;
    const cy = 200;
    const antes = { x: (cx - v.x) / v.escala, y: (cy - v.y) / v.escala };
    const n = acercarVista(v, -100, cx, cy, m);
    expect((cx - n.x) / n.escala).toBeCloseTo(antes.x);
    expect((cy - n.y) / n.escala).toBeCloseTo(antes.y);
  });

  it("la escala tiene un mínimo y un máximo", () => {
    let v = VISTA_INICIAL;
    for (let i = 0; i < 50; i++) v = acercarVista(v, -100, 0, 0, m);
    expect(v.escala).toBe(ESCALA_MAXIMA);
    for (let i = 0; i < 100; i++) v = acercarVista(v, 100, 0, 0, m);
    expect(v.escala).toBe(ESCALA_MINIMA);
  });

  it("limitar no toca una vista que ya es válida", () => {
    expect(limitarVista({ x: 10, y: -20, escala: 1.5 }, m)).toEqual({ x: 10, y: -20, escala: 1.5 });
  });
});

describe("arrastrar un carril (H17)", () => {
  const carril = { posicionX: 300, ancho: 400 };

  it("desde la cabecera se mueve entero, sin salir por la izquierda", () => {
    expect(arrastrarCarril(carril, "mover", 50)).toEqual({ posicionX: 350, ancho: 400 });
    expect(arrastrarCarril(carril, "mover", -1000)).toEqual({ posicionX: 0, ancho: 400 });
  });

  it("desde el borde derecho cambia el ancho y deja fijo el izquierdo", () => {
    expect(arrastrarCarril(carril, "derecha", 100)).toEqual({ posicionX: 300, ancho: 500 });
    expect(arrastrarCarril(carril, "derecha", -1000)).toEqual({ posicionX: 300, ancho: 120 });
  });

  it("desde el borde izquierdo cambia el ancho y deja fijo el derecho", () => {
    expect(arrastrarCarril(carril, "izquierda", -100)).toEqual({ posicionX: 200, ancho: 500 });
    expect(arrastrarCarril(carril, "izquierda", 1000)).toEqual({ posicionX: 580, ancho: 120 });
    // No pasa del borde izquierdo del lienzo.
    expect(arrastrarCarril(carril, "izquierda", -1000)).toEqual({ posicionX: 0, ancho: 700 });
  });

  it("el ancho no supera el máximo", () => {
    expect(arrastrarCarril(carril, "derecha", 5000).ancho).toBe(2000);
    expect(arrastrarCarril({ posicionX: 3000, ancho: 400 }, "izquierda", -5000)).toEqual({ posicionX: 1400, ancho: 2000 });
  });
});
