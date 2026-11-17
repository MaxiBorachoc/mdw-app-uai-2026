import { describe, expect, it } from "vitest";
import { acercarVista, desplazarVista, ESCALA_MAXIMA, ESCALA_MINIMA, limitarVista, MARGEN_VISIBLE, VISTA_INICIAL } from "./lienzo";

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
