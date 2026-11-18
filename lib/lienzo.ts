/**
 * H5: la vista del lienzo de un diagrama. El lienzo no tiene barras de
 * desplazamiento: la vista se desplaza arrastrando el fondo y se acerca o aleja con
 * la rueda del mouse, hacia donde está el cursor.
 *
 * La vista es solo de pantalla: no cambia las posiciones guardadas de los nodos.
 * Un punto del diagrama (x, y) se dibuja en (vista.x + x * vista.escala,
 * vista.y + y * vista.escala) del recuadro del lienzo.
 */

import { ANCHO_CARRIL_MAX, ANCHO_CARRIL_MIN } from "./schemas/carril";

export type Vista = { x: number; y: number; escala: number };

export const VISTA_INICIAL: Vista = { x: 0, y: 0, escala: 1 };
export const ESCALA_MINIMA = 0.25;
export const ESCALA_MAXIMA = 2;
// Lo que queda del diagrama a la vista como mínimo al desplazarlo, para no perderlo.
export const MARGEN_VISIBLE = 80;

type Medidas = { anchoVisible: number; altoVisible: number; anchoDiagrama: number; altoDiagrama: number };

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** La vista corregida para que siempre quede a la vista una parte del diagrama. */
export function limitarVista(v: Vista, m: Medidas): Vista {
  const escala = entre(v.escala, ESCALA_MINIMA, ESCALA_MAXIMA);
  return {
    escala,
    x: entre(v.x, MARGEN_VISIBLE - m.anchoDiagrama * escala, m.anchoVisible - MARGEN_VISIBLE),
    y: entre(v.y, MARGEN_VISIBLE - m.altoDiagrama * escala, m.altoVisible - MARGEN_VISIBLE),
  };
}

/** La vista desplazada (dx, dy) píxeles de pantalla. */
export function desplazarVista(v: Vista, dx: number, dy: number, m: Medidas): Vista {
  return limitarVista({ ...v, x: v.x + dx, y: v.y + dy }, m);
}

/**
 * La vista acercada (rueda hacia arriba, `delta` negativo) o alejada (`delta`
 * positivo) manteniendo fijo el punto del diagrama que está bajo el cursor
 * (cx, cy, relativos al recuadro del lienzo).
 */
export function acercarVista(v: Vista, delta: number, cx: number, cy: number, m: Medidas): Vista {
  // Un giro grande de la rueda no salta de golpe de una punta a la otra.
  const factor = Math.exp(-entre(delta, -100, 100) * 0.002);
  const escala = entre(v.escala * factor, ESCALA_MINIMA, ESCALA_MAXIMA);
  const px = (cx - v.x) / v.escala;
  const py = (cy - v.y) / v.escala;
  return limitarVista({ escala, x: cx - px * escala, y: cy - py * escala }, m);
}

// ---------------------------------------------------------------------------
// H17: arrastrar un carril
// ---------------------------------------------------------------------------

export type ModoArrastreCarril = "mover" | "izquierda" | "derecha";
type Franja = { posicionX: number; ancho: number };

/**
 * Dónde queda un carril al arrastrarlo `dx` píxeles del diagrama: desde la
 * cabecera se mueve entero; desde un borde se estira o se encoge con el borde
 * opuesto fijo. Nunca sale por la izquierda del lienzo y el ancho respeta el mínimo
 * y el máximo.
 */
export function arrastrarCarril(inicio: Franja, modo: ModoArrastreCarril, dx: number): Franja {
  if (modo === "mover") return { posicionX: Math.max(0, Math.round(inicio.posicionX + dx)), ancho: inicio.ancho };
  if (modo === "derecha") {
    return { posicionX: inicio.posicionX, ancho: entre(Math.round(inicio.ancho + dx), ANCHO_CARRIL_MIN, ANCHO_CARRIL_MAX) };
  }
  const derecha = inicio.posicionX + inicio.ancho;
  const posicionX = entre(Math.round(inicio.posicionX + dx), Math.max(0, derecha - ANCHO_CARRIL_MAX), derecha - ANCHO_CARRIL_MIN);
  return { posicionX, ancho: derecha - posicionX };
}
