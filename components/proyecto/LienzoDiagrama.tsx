"use client";

/**
 * El lienzo de un diagrama (H5, H6, H7, H10): las actividades internas de una
 * actividad como nodos, y las flechas entre ellas.
 *
 * - Un nodo se arrastra con el mouse o se mueve con las flechas del teclado. La
 *   posición se pasa al borrador al soltar: un arrastre es un solo cambio.
 * - Doble clic (o Enter) abre el diagrama interno de una actividad.
 * - "Conectar actividades" une un origen y un destino; se permite una flecha de
 *   una actividad hacia sí misma.
 * - Las flechas se dibujan solas, de borde a borde de los nodos.
 *
 * No guarda nada: avisa cada gesto al componente padre, que actualiza el borrador.
 */
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { cantidad, cn } from "@/lib/utils";

export const ANCHO_NODO = 176;
export const ALTO_NODO = 64;
const PASO_TECLADO = 10;

export type NodoLienzo = { id: string; nombre: string; x: number; y: number; internas: number; historias: number };
export type FlechaLienzo = { id: string; origenId: string; destinoId: string };

type Arrastre = { id: string; inicioX: number; inicioY: number; x0: number; y0: number; x: number; y: number; movido: boolean };

/** Punto del borde de un nodo en dirección a (dx, dy) desde su centro. */
function borde(cx: number, cy: number, dx: number, dy: number) {
  const t = 1 / Math.max(Math.abs(dx) / (ANCHO_NODO / 2), Math.abs(dy) / (ALTO_NODO / 2), 1e-6);
  return { x: cx + dx * t, y: cy + dy * t };
}

/** Un lugar libre para una actividad nueva, recorriendo una grilla. */
export function lugarLibre(nodos: { x: number; y: number }[]): { x: number; y: number } {
  for (let fila = 0; fila < 50; fila++) {
    for (let columna = 0; columna < 5; columna++) {
      const x = 40 + columna * (ANCHO_NODO + 60);
      const y = 40 + fila * (ALTO_NODO + 60);
      const ocupado = nodos.some((n) => Math.abs(n.x - x) < ANCHO_NODO && Math.abs(n.y - y) < ALTO_NODO);
      if (!ocupado) return { x, y };
    }
  }
  return { x: 40, y: 40 };
}

export function LienzoDiagrama({
  titulo,
  nodos,
  flechas,
  soloLectura,
  seleccionado,
  flechaResaltada,
  onSeleccionarNodo,
  onAbrirNodo,
  onMoverNodo,
  onCrearNodo,
  onConectar,
  onEliminarFlecha,
}: {
  titulo: string;
  nodos: NodoLienzo[];
  flechas: FlechaLienzo[];
  soloLectura: boolean;
  seleccionado: string | null;
  flechaResaltada: string | null;
  onSeleccionarNodo: (id: string) => void;
  onAbrirNodo: (id: string) => void;
  onMoverNodo: (id: string, x: number, y: number) => void;
  onCrearNodo: (x: number, y: number) => void;
  onConectar: (origenId: string, destinoId: string) => void;
  onEliminarFlecha: (id: string) => void;
}) {
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [conectando, setConectando] = useState(false);
  const [origen, setOrigen] = useState<string | null>(null);
  const [flechaElegida, setFlechaElegida] = useState<string | null>(null);
  // Después de arrastrar, el navegador igual dispara un click: se lo ignora.
  const ignorarClick = useRef(false);

  const posiciones = useMemo(() => {
    const mapa = new Map(nodos.map((n) => [n.id, { x: n.x, y: n.y }]));
    if (arrastre) mapa.set(arrastre.id, { x: arrastre.x, y: arrastre.y });
    return mapa;
  }, [nodos, arrastre]);

  const ancho = Math.max(1100, ...[...posiciones.values()].map((p) => p.x + ANCHO_NODO + 160));
  const alto = Math.max(520, ...[...posiciones.values()].map((p) => p.y + ALTO_NODO + 160));
  const nombre = (id: string) => nodos.find((n) => n.id === id)?.nombre ?? "";

  const alPresionar = (e: PointerEvent<HTMLButtonElement>, nodo: NodoLienzo) => {
    if (soloLectura || conectando || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastre({ id: nodo.id, inicioX: e.clientX, inicioY: e.clientY, x0: nodo.x, y0: nodo.y, x: nodo.x, y: nodo.y, movido: false });
  };
  const alMover = (e: PointerEvent<HTMLButtonElement>) => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.inicioX;
    const dy = e.clientY - arrastre.inicioY;
    const movido = arrastre.movido || Math.hypot(dx, dy) > 4;
    setArrastre({ ...arrastre, movido, x: Math.max(0, Math.round(arrastre.x0 + dx)), y: Math.max(0, Math.round(arrastre.y0 + dy)) });
  };
  const alSoltar = () => {
    if (!arrastre) return;
    if (arrastre.movido) {
      ignorarClick.current = true;
      onMoverNodo(arrastre.id, arrastre.x, arrastre.y);
    }
    setArrastre(null);
  };

  const alClick = (id: string) => {
    if (ignorarClick.current) {
      ignorarClick.current = false;
      return;
    }
    setFlechaElegida(null);
    if (conectando) {
      if (origen === null) {
        setOrigen(id);
      } else {
        onConectar(origen, id);
        setOrigen(null);
        setConectando(false);
      }
      return;
    }
    onSeleccionarNodo(id);
  };

  const alTeclaNodo = (e: KeyboardEvent<HTMLButtonElement>, nodo: NodoLienzo) => {
    if (e.key === "Enter" && !conectando) {
      e.preventDefault();
      onAbrirNodo(nodo.id);
      return;
    }
    if (soloLectura || conectando) return;
    const paso = e.shiftKey ? PASO_TECLADO * 5 : PASO_TECLADO;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-paso, 0],
      ArrowRight: [paso, 0],
      ArrowUp: [0, -paso],
      ArrowDown: [0, paso],
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    onMoverNodo(nodo.id, Math.max(0, nodo.x + d[0]), Math.max(0, nodo.y + d[1]));
  };

  const centro = (id: string) => {
    const p = posiciones.get(id);
    return p ? { x: p.x + ANCHO_NODO / 2, y: p.y + ALTO_NODO / 2 } : null;
  };

  const trazo = (f: FlechaLienzo) => {
    const p = posiciones.get(f.origenId);
    if (!p) return null;
    if (f.origenId === f.destinoId) {
      // Flecha de una actividad hacia sí misma: un lazo sobre la esquina superior derecha.
      const x1 = p.x + ANCHO_NODO * 0.7;
      const y2 = p.y + ALTO_NODO * 0.3;
      return `M ${x1} ${p.y} C ${x1} ${p.y - 46}, ${p.x + ANCHO_NODO + 46} ${y2}, ${p.x + ANCHO_NODO} ${y2}`;
    }
    const a = centro(f.origenId);
    const b = centro(f.destinoId);
    if (!a || !b) return null;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    // Si también existe la flecha inversa, cada una se corre a un costado para verse las dos.
    const inversa = flechas.some((g) => g.origenId === f.destinoId && g.destinoId === f.origenId);
    const largo = Math.hypot(dx, dy) || 1;
    const corrimiento = inversa ? 8 : 0;
    const ox = (-dy / largo) * corrimiento;
    const oy = (dx / largo) * corrimiento;
    const inicio = borde(a.x + ox, a.y + oy, dx, dy);
    dx = -dx;
    dy = -dy;
    const fin = borde(b.x + ox, b.y + oy, dx, dy);
    return `M ${inicio.x} ${inicio.y} L ${fin.x} ${fin.y}`;
  };

  const eliminarElegida = () => {
    if (flechaElegida) onEliminarFlecha(flechaElegida);
    setFlechaElegida(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {!soloLectura && (
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={`Herramientas del diagrama ${titulo}`}>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const lugar = lugarLibre(nodos);
              onCrearNodo(lugar.x, lugar.y);
            }}
          >
            Nueva actividad
          </Button>
          <Button
            type="button"
            size="sm"
            variant={conectando ? "primary" : "outline"}
            aria-pressed={conectando}
            disabled={nodos.length === 0}
            onClick={() => {
              setConectando(!conectando);
              setOrigen(null);
            }}
          >
            {conectando ? "Cancelar conexión" : "Conectar actividades"}
          </Button>
          {flechaElegida && (
            <Button type="button" size="sm" variant="danger" onClick={eliminarElegida}>
              Eliminar flecha
            </Button>
          )}
          {/* En su propia línea: si el texto cambia de largo, el lienzo no salta. */}
          <p className="basis-full text-xs text-muted-foreground" aria-live="polite">
            {conectando
              ? origen
                ? `Origen: ${nombre(origen)}. Elegí la actividad de destino (puede ser la misma).`
                : "Elegí la actividad de origen."
              : "Arrastrá o usá las flechas del teclado para mover. Doble clic o Enter abre el diagrama interno."}
          </p>
        </div>
      )}

      <div className="h-[30rem] overflow-auto rounded-[var(--radius)] border bg-muted">
        <div
          role="group"
          aria-label={`Diagrama ${titulo}`}
          className="relative"
          style={{ width: ancho, height: alto }}
        >
          <svg className="absolute inset-0 text-slate-500" width={ancho} height={alto} aria-hidden={flechas.length === 0}>
            <defs>
              <marker id="punta-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {flechas.map((f) => {
              const d = trazo(f);
              if (!d) return null;
              const activa = flechaElegida === f.id || flechaResaltada === f.id;
              return (
                <g
                  key={f.id}
                  role="button"
                  tabIndex={soloLectura ? -1 : 0}
                  aria-label={`Flecha de ${nombre(f.origenId)} a ${nombre(f.destinoId)}`}
                  aria-pressed={flechaElegida === f.id}
                  className={cn("outline-none", activa ? "text-primary" : "text-slate-500")}
                  onClick={() => !soloLectura && setFlechaElegida(f.id)}
                  onKeyDown={(e) => {
                    if (soloLectura) return;
                    if (e.key === "Enter" || e.key === " ") setFlechaElegida(f.id);
                    if (e.key === "Delete" || e.key === "Backspace") onEliminarFlecha(f.id);
                  }}
                >
                  <path d={d} fill="none" stroke="transparent" strokeWidth={14} className="cursor-pointer" />
                  <path
                    d={d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={activa ? 3 : 2}
                    markerEnd="url(#punta-flecha)"
                    className={cn(flechaResaltada === f.id && "animate-pulse")}
                  />
                </g>
              );
            })}
          </svg>

          {nodos.map((n) => {
            const p = posiciones.get(n.id) ?? { x: n.x, y: n.y };
            return (
              <button
                key={n.id}
                type="button"
                aria-label={`Actividad ${n.nombre}${n.internas ? `, ${cantidad(n.internas, "interna", "internas")}` : ""}`}
                // El nombre se corta a una línea; el título lo muestra completo.
                title={n.nombre}
                aria-pressed={seleccionado === n.id}
                className={cn(
                  "absolute flex flex-col items-start justify-center gap-0.5 rounded-[var(--radius)] border-2 bg-card px-3 text-left shadow-sm",
                  "touch-none select-none",
                  seleccionado === n.id ? "border-primary" : "border-input",
                  origen === n.id && "ring-4 ring-primary/40",
                  !soloLectura && !conectando && "cursor-grab active:cursor-grabbing",
                  conectando && "cursor-crosshair",
                )}
                style={{ left: p.x, top: p.y, width: ANCHO_NODO, height: ALTO_NODO }}
                onPointerDown={(e) => alPresionar(e, n)}
                onPointerMove={alMover}
                onPointerUp={alSoltar}
                onPointerCancel={() => setArrastre(null)}
                onClick={() => alClick(n.id)}
                onDoubleClick={() => onAbrirNodo(n.id)}
                onKeyDown={(e) => alTeclaNodo(e, n)}
              >
                <span className="line-clamp-1 text-sm font-semibold">{n.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {n.internas > 0 ? cantidad(n.internas, "interna", "internas") : "Sin internas"}
                  {n.historias > 0 ? ` · ${cantidad(n.historias, "historia", "historias")}` : ""}
                </span>
              </button>
            );
          })}

          {nodos.length === 0 && (
            <p className="absolute left-6 top-6 max-w-sm text-sm text-muted-foreground">
              {soloLectura
                ? "Este diagrama no tiene actividades."
                : "Este diagrama todavía no tiene actividades. Creá la primera con “Nueva actividad”."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
