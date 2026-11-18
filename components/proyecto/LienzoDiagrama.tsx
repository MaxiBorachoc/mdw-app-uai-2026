"use client";

/**
 * El lienzo de un diagrama (H5, H6, H7, H10, H16, H17): los nodos internos de una
 * actividad (actividades y nodos de control de UML) y las flechas entre ellos.
 *
 * - La barra de herramientas muestra la figura de cada elemento que se agrega y una
 *   flecha para conectar (H16); el nombre de cada uno aparece al pasar el mouse.
 * - Un nodo se arrastra con el mouse o se mueve con las flechas del teclado. La
 *   posición se pasa al borrador al soltar: un arrastre es un solo cambio.
 * - Sin barras de desplazamiento (H5): arrastrar el fondo desplaza la vista y la
 *   rueda del mouse la acerca o aleja. La vista no se guarda (ver lib/lienzo.ts).
 * - Doble clic (o Enter) abre el diagrama interno de una actividad. Los nodos de
 *   control no tienen diagrama interno.
 * - "Conectar elementos" une un origen y un destino; las reglas de UML que se
 *   validan (H16) las controla quien recibe el gesto.
 * - Las flechas se dibujan solas, de borde a borde de la forma de cada nodo, con su
 *   guarda entre corchetes si tiene una.
 * - H17: los carriles son franjas verticales detrás de los nodos. La cabecera se
 *   arrastra para moverlos y cada borde lateral, para cambiar el ancho. Son solo
 *   visuales: ningún gesto sobre un carril mueve nodos.
 *
 * No guarda nada: avisa cada gesto al componente padre, que actualiza el borrador.
 * Las coordenadas son píxeles del diagrama: así se guardan las posiciones (posición X e Y).
 */
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { esNodoDeControl, etiquetaTipoNodo, type TipoNodo } from "@/lib/documentacion";
import { acercarVista, arrastrarCarril, desplazarVista, VISTA_INICIAL, type ModoArrastreCarril, type Vista } from "@/lib/lienzo";
import { GUARDA_MAX } from "@/lib/schemas/conexionActividad";
import { cn } from "@/lib/utils";

export const ANCHO_NODO = 176;
export const ALTO_NODO = 64;
const PASO_TECLADO = 10;

export type NodoLienzo = { id: string; tipo: TipoNodo; nombre: string; x: number; y: number };
export type FlechaLienzo = { id: string; origenId: string; destinoId: string; guarda: string };
// H17: un carril es una franja vertical de todo el alto del lienzo.
export type CarrilLienzo = { id: string; nombre: string; x: number; ancho: number };

type Arrastre = { id: string; inicioX: number; inicioY: number; x0: number; y0: number; x: number; y: number; movido: boolean };
type ArrastreCarril = { id: string; modo: ModoArrastreCarril; inicioX: number; x0: number; ancho0: number; x: number; ancho: number; movido: boolean };

// Alto de la cabecera de un carril, donde va su nombre (se arrastra para moverlo).
const ALTO_CABECERA_CARRIL = 36;

// H16: tamaño de cada forma en el lienzo. La actividad es un rectángulo; los nodos de
// control, formas chicas de UML.
const tamanios: Record<TipoNodo, { ancho: number; alto: number }> = {
  ACTIVIDAD: { ancho: ANCHO_NODO, alto: ALTO_NODO },
  INICIAL: { ancho: 32, alto: 32 },
  FINAL_ACTIVIDAD: { ancho: 36, alto: 36 },
  FINAL_FLUJO: { ancho: 36, alto: 36 },
  DECISION: { ancho: 56, alto: 56 },
  BIFURCACION: { ancho: 128, alto: 14 },
};

// Las figuras de la barra de herramientas, en ese orden, con su tamaño de ícono.
const HERRAMIENTAS: { tipo: TipoNodo; ancho: number; alto: number }[] = [
  { tipo: "ACTIVIDAD", ancho: 28, alto: 18 },
  { tipo: "INICIAL", ancho: 18, alto: 18 },
  { tipo: "FINAL_ACTIVIDAD", ancho: 20, alto: 20 },
  { tipo: "FINAL_FLUJO", ancho: 20, alto: 20 },
  { tipo: "DECISION", ancho: 22, alto: 22 },
  { tipo: "BIFURCACION", ancho: 28, alto: 6 },
];

/**
 * Punto del borde de un nodo en dirección a (dx, dy) desde su centro, según su
 * forma: rectángulo (actividad y barra), círculo o rombo.
 */
function borde(cx: number, cy: number, dx: number, dy: number, tipo: TipoNodo) {
  const { ancho, alto } = tamanios[tipo];
  const largo = Math.hypot(dx, dy) || 1;
  if (tipo === "INICIAL" || tipo === "FINAL_ACTIVIDAD" || tipo === "FINAL_FLUJO") {
    const r = ancho / 2;
    return { x: cx + (dx / largo) * r, y: cy + (dy / largo) * r };
  }
  const t =
    tipo === "DECISION"
      ? 1 / Math.max(Math.abs(dx) / (ancho / 2) + Math.abs(dy) / (alto / 2), 1e-6)
      : 1 / Math.max(Math.abs(dx) / (ancho / 2), Math.abs(dy) / (alto / 2), 1e-6);
  return { x: cx + dx * t, y: cy + dy * t };
}

/**
 * La forma de UML de un nodo: la de un nodo de control dentro de su botón en el
 * lienzo, o la de cualquier tipo como figura de la barra de herramientas (con el
 * tamaño del ícono).
 */
function forma(tipo: TipoNodo, { ancho, alto } = tamanios[tipo]): ReactNode {
  const svg = (contenido: ReactNode) => (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true" className="overflow-visible">
      {contenido}
    </svg>
  );
  const c = ancho / 2;
  // Proporciones del punto y de la cruz de los nodos finales (sobre un círculo de 36: 11 y 7).
  const punto = c * 0.61;
  const cruz = c * 0.39;
  switch (tipo) {
    case "ACTIVIDAD":
      return svg(<rect x={1} y={1} width={ancho - 2} height={alto - 2} rx={4} fill="var(--card)" stroke="currentColor" strokeWidth={2} />);
    case "INICIAL":
      return svg(<circle cx={c} cy={c} r={c - 1} fill="currentColor" />);
    case "FINAL_ACTIVIDAD":
      return svg(
        <>
          <circle cx={c} cy={c} r={c - 1.5} fill="var(--card)" stroke="currentColor" strokeWidth={2} />
          <circle cx={c} cy={c} r={punto} fill="currentColor" />
        </>,
      );
    case "FINAL_FLUJO":
      return svg(
        <>
          <circle cx={c} cy={c} r={c - 1.5} fill="var(--card)" stroke="currentColor" strokeWidth={2} />
          <path
            d={`M ${c - cruz} ${c - cruz} L ${c + cruz} ${c + cruz} M ${c + cruz} ${c - cruz} L ${c - cruz} ${c + cruz}`}
            stroke="currentColor"
            strokeWidth={2}
          />
        </>,
      );
    case "DECISION":
      return svg(
        <polygon points={`${c},1 ${ancho - 1},${alto / 2} ${c},${alto - 1} 1,${alto / 2}`} fill="var(--card)" stroke="currentColor" strokeWidth={2} />,
      );
    case "BIFURCACION":
      return svg(<rect x={0} y={0} width={ancho} height={alto} rx={Math.min(3, alto / 2)} fill="currentColor" />);
  }
}

/** La figura de "Carril": una franja vertical con su cabecera. */
const iconoCarril = (
  <svg width={20} height={24} viewBox="0 0 20 24" aria-hidden="true">
    <rect x={1} y={1} width={18} height={22} rx={2} fill="var(--card)" stroke="currentColor" strokeWidth={2} />
    <path d="M 1 7 L 19 7" stroke="currentColor" strokeWidth={2} />
  </svg>
);

/** La figura de "Conectar elementos": una flecha. */
const iconoFlecha = (
  <svg width={28} height={18} viewBox="0 0 28 18" aria-hidden="true">
    <path d="M 2 9 L 21 9" stroke="currentColor" strokeWidth={2} />
    <path d="M 19 4 L 27 9 L 19 14 z" fill="currentColor" />
  </svg>
);

/** Un lugar libre para un nodo nuevo, recorriendo una grilla. */
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
  onCambiarGuarda,
  carriles,
  carrilElegido,
  onSeleccionarCarril,
  onCrearCarril,
  onCambiarCarril,
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
  onCrearNodo: (x: number, y: number, tipo: TipoNodo) => void;
  onConectar: (origenId: string, destinoId: string) => void;
  onEliminarFlecha: (id: string) => void;
  onCambiarGuarda: (id: string, guarda: string) => void;
  carriles: CarrilLienzo[];
  carrilElegido: string | null;
  onSeleccionarCarril: (id: string) => void;
  onCrearCarril: () => void;
  onCambiarCarril: (id: string, cambio: { posicionX: number; ancho: number }) => void;
}) {
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [arrastreCarril, setArrastreCarril] = useState<ArrastreCarril | null>(null);
  const [conectando, setConectando] = useState(false);
  const [origen, setOrigen] = useState<string | null>(null);
  const [flechaElegida, setFlechaElegida] = useState<string | null>(null);
  // Después de arrastrar, el navegador igual dispara un click: se lo ignora.
  const ignorarClick = useRef(false);
  const [vista, setVista] = useState<Vista>(VISTA_INICIAL);
  // Mientras se arrastra el fondo: el último punto del puntero.
  const [paneo, setPaneo] = useState<{ x: number; y: number } | null>(null);
  const recuadro = useRef<HTMLDivElement>(null);

  const porId = useMemo(() => new Map(nodos.map((n) => [n.id, n])), [nodos]);
  const posiciones = useMemo(() => {
    const mapa = new Map(nodos.map((n) => [n.id, { x: n.x, y: n.y }]));
    if (arrastre) mapa.set(arrastre.id, { x: arrastre.x, y: arrastre.y });
    return mapa;
  }, [nodos, arrastre]);

  // H17: durante un arrastre, el carril se dibuja donde va quedando.
  const franjas = useMemo(
    () =>
      carriles.map((c) =>
        arrastreCarril?.id === c.id ? { ...c, x: arrastreCarril.x, ancho: arrastreCarril.ancho } : c,
      ),
    [carriles, arrastreCarril],
  );

  const ancho = Math.max(
    1100,
    ...[...posiciones.values()].map((p) => p.x + ANCHO_NODO + 160),
    ...franjas.map((c) => c.x + c.ancho + 160),
  );
  const alto = Math.max(520, ...[...posiciones.values()].map((p) => p.y + ALTO_NODO + 160));
  const nombre = (id: string) => {
    const n = porId.get(id);
    return n ? (esNodoDeControl(n.tipo) ? etiquetaTipoNodo[n.tipo] : n.nombre) : "";
  };
  const tipoDe = (id: string): TipoNodo => porId.get(id)?.tipo ?? "ACTIVIDAD";

  const crear = (tipo: TipoNodo) => {
    const lugar = lugarLibre(nodos);
    onCrearNodo(lugar.x, lugar.y, tipo);
  };

  // Lo que mide el recuadro visible y el diagrama, para no perder el diagrama de vista.
  const medidas = () => ({
    anchoVisible: recuadro.current?.clientWidth ?? 0,
    altoVisible: recuadro.current?.clientHeight ?? 0,
    anchoDiagrama: ancho,
    altoDiagrama: alto,
  });

  // La rueda acerca o aleja hacia el cursor. Se escucha a mano porque React registra
  // la rueda como pasiva y así no se puede evitar que se desplace la página.
  useEffect(() => {
    const r = recuadro.current;
    if (!r) return;
    const alGirar = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      const caja = r.getBoundingClientRect();
      const m = { anchoVisible: r.clientWidth, altoVisible: r.clientHeight, anchoDiagrama: ancho, altoDiagrama: alto };
      setVista((v) => acercarVista(v, delta, e.clientX - caja.left, e.clientY - caja.top, m));
    };
    r.addEventListener("wheel", alGirar, { passive: false });
    return () => r.removeEventListener("wheel", alGirar);
  }, [ancho, alto]);

  // Arrastrar el fondo (no un nodo, una flecha, ni la cabecera o un borde de un
  // carril) desplaza la vista. El cuerpo de un carril cuenta como fondo.
  const alPresionarFondo = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as Element).closest('button, [role="button"], [data-borde-carril]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPaneo({ x: e.clientX, y: e.clientY });
  };
  const alMoverFondo = (e: PointerEvent<HTMLDivElement>) => {
    if (!paneo) return;
    const m = medidas();
    setVista((v) => desplazarVista(v, e.clientX - paneo.x, e.clientY - paneo.y, m));
    setPaneo({ x: e.clientX, y: e.clientY });
  };

  // Un nodo que se recorre o se mueve con el teclado no queda fuera de la vista.
  const mostrar = (n: { tipo: TipoNodo; x: number; y: number }) => {
    const m = medidas();
    const { ancho: w, alto: h } = tamanios[n.tipo];
    setVista((v) => {
      const izquierda = v.x + n.x * v.escala;
      const arriba = v.y + n.y * v.escala;
      const derecha = izquierda + w * v.escala;
      const abajo = arriba + h * v.escala;
      const dx = izquierda < 0 ? 16 - izquierda : derecha > m.anchoVisible ? m.anchoVisible - 16 - derecha : 0;
      const dy = arriba < 0 ? 16 - arriba : abajo > m.altoVisible ? m.altoVisible - 16 - abajo : 0;
      return dx || dy ? desplazarVista(v, dx, dy, m) : v;
    });
  };
  const alEnfocar = (e: FocusEvent<HTMLButtonElement>, n: NodoLienzo) => {
    // Solo con el teclado: con el mouse el nodo ya está a la vista y la vista no salta.
    if (e.currentTarget.matches(":focus-visible")) mostrar(n);
  };

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
    // El puntero se mueve en píxeles de pantalla; el nodo, en los del diagrama.
    const x = Math.max(0, Math.round(arrastre.x0 + dx / vista.escala));
    const y = Math.max(0, Math.round(arrastre.y0 + dy / vista.escala));
    setArrastre({ ...arrastre, movido, x, y });
  };
  const alSoltar = () => {
    if (!arrastre) return;
    if (arrastre.movido) {
      ignorarClick.current = true;
      onMoverNodo(arrastre.id, arrastre.x, arrastre.y);
    }
    setArrastre(null);
  };

  // --- H17: carriles. La cabecera mueve el carril; cada borde lo estira o lo encoge
  // con el borde opuesto fijo. Ningún gesto sobre un carril toca los nodos.
  const alPresionarCarril = (e: PointerEvent<HTMLElement>, c: CarrilLienzo, modo: ModoArrastreCarril) => {
    if (soloLectura || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastreCarril({ id: c.id, modo, inicioX: e.clientX, x0: c.x, ancho0: c.ancho, x: c.x, ancho: c.ancho, movido: false });
  };
  const alMoverCarril = (e: PointerEvent<HTMLElement>) => {
    if (!arrastreCarril) return;
    const dx = e.clientX - arrastreCarril.inicioX;
    const movido = arrastreCarril.movido || Math.abs(dx) > 4;
    const franja = arrastrarCarril({ posicionX: arrastreCarril.x0, ancho: arrastreCarril.ancho0 }, arrastreCarril.modo, dx / vista.escala);
    setArrastreCarril({ ...arrastreCarril, movido, x: franja.posicionX, ancho: franja.ancho });
  };
  const alSoltarCarril = () => {
    if (!arrastreCarril) return;
    if (arrastreCarril.movido) {
      if (arrastreCarril.modo === "mover") ignorarClick.current = true;
      onCambiarCarril(arrastreCarril.id, { posicionX: arrastreCarril.x, ancho: arrastreCarril.ancho });
    }
    setArrastreCarril(null);
  };
  const alClickCarril = (id: string) => {
    if (ignorarClick.current) {
      ignorarClick.current = false;
      return;
    }
    setFlechaElegida(null);
    onSeleccionarCarril(id);
  };
  const alTeclaCarril = (e: KeyboardEvent<HTMLButtonElement>, c: CarrilLienzo) => {
    if (soloLectura) return;
    const paso = e.shiftKey ? PASO_TECLADO * 5 : PASO_TECLADO;
    const d = e.key === "ArrowLeft" ? -paso : e.key === "ArrowRight" ? paso : 0;
    if (!d) return;
    e.preventDefault();
    onCambiarCarril(c.id, { posicionX: Math.max(0, c.x + d), ancho: c.ancho });
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

  // Solo una actividad tiene diagrama interno para abrir.
  const abrir = (nodo: NodoLienzo) => {
    if (!esNodoDeControl(nodo.tipo)) onAbrirNodo(nodo.id);
  };

  const alTeclaNodo = (e: KeyboardEvent<HTMLButtonElement>, nodo: NodoLienzo) => {
    if (e.key === "Enter" && !conectando) {
      e.preventDefault();
      abrir(nodo);
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
    const x = Math.max(0, nodo.x + d[0]);
    const y = Math.max(0, nodo.y + d[1]);
    onMoverNodo(nodo.id, x, y);
    mostrar({ tipo: nodo.tipo, x, y });
  };

  const centro = (id: string) => {
    const p = posiciones.get(id);
    if (!p) return null;
    const { ancho: w, alto: h } = tamanios[tipoDe(id)];
    return { x: p.x + w / 2, y: p.y + h / 2 };
  };

  // El recorrido de una flecha y el punto donde va su guarda.
  const trazo = (f: FlechaLienzo): { d: string; etiqueta: { x: number; y: number } } | null => {
    const p = posiciones.get(f.origenId);
    if (!p) return null;
    if (f.origenId === f.destinoId) {
      // Flecha de una actividad hacia sí misma: un lazo sobre la esquina superior derecha.
      const { ancho: w, alto: h } = tamanios[tipoDe(f.origenId)];
      const x1 = p.x + w * 0.7;
      const y2 = p.y + h * 0.3;
      return {
        d: `M ${x1} ${p.y} C ${x1} ${p.y - 46}, ${p.x + w + 46} ${y2}, ${p.x + w} ${y2}`,
        etiqueta: { x: p.x + w + 28, y: p.y - 30 },
      };
    }
    const a = centro(f.origenId);
    const b = centro(f.destinoId);
    if (!a || !b) return null;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // Si también existe la flecha inversa, cada una se corre a un costado para verse las dos.
    const inversa = flechas.some((g) => g.origenId === f.destinoId && g.destinoId === f.origenId);
    const largo = Math.hypot(dx, dy) || 1;
    const corrimiento = inversa ? 8 : 0;
    const ox = (-dy / largo) * corrimiento;
    const oy = (dx / largo) * corrimiento;
    const inicio = borde(a.x + ox, a.y + oy, dx, dy, tipoDe(f.origenId));
    const fin = borde(b.x + ox, b.y + oy, -dx, -dy, tipoDe(f.destinoId));
    return {
      d: `M ${inicio.x} ${inicio.y} L ${fin.x} ${fin.y}`,
      // La guarda, al medio y un poco corrida hacia un costado para no tapar la línea.
      etiqueta: { x: (inicio.x + fin.x) / 2 + (-dy / largo) * 12, y: (inicio.y + fin.y) / 2 + (dx / largo) * 12 },
    };
  };

  const eliminarElegida = () => {
    if (flechaElegida) onEliminarFlecha(flechaElegida);
    setFlechaElegida(null);
  };
  const elegida = flechas.find((f) => f.id === flechaElegida);

  return (
    <div className="flex flex-col gap-3">
      {!soloLectura && (
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={`Herramientas del diagrama ${titulo}`}>
          {/* H16: la figura de cada elemento; el nombre se ve al pasar el mouse. */}
          {HERRAMIENTAS.map(({ tipo, ancho: w, alto: h }) => (
            <Button
              key={tipo}
              type="button"
              size="sm"
              variant="outline"
              className="w-11 px-0"
              title={etiquetaTipoNodo[tipo]}
              aria-label={etiquetaTipoNodo[tipo]}
              onClick={() => crear(tipo)}
            >
              {forma(tipo, { ancho: w, alto: h })}
            </Button>
          ))}
          {/* H17 */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-11 px-0"
            title="Carril"
            aria-label="Carril"
            onClick={onCrearCarril}
          >
            {iconoCarril}
          </Button>
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
          <Button
            type="button"
            size="sm"
            variant={conectando ? "primary" : "outline"}
            className="w-11 px-0"
            title="Conectar elementos"
            aria-label="Conectar elementos"
            aria-pressed={conectando}
            disabled={nodos.length === 0}
            onClick={() => {
              setConectando(!conectando);
              setOrigen(null);
            }}
          >
            {iconoFlecha}
          </Button>
          {elegida && (
            <>
              {/* H16: la guarda de la flecha elegida. */}
              <label htmlFor="guarda-flecha" className="text-sm font-medium">
                Guarda
              </label>
              <Input
                id="guarda-flecha"
                className="h-9 w-56"
                placeholder="Ej.: pago aprobado"
                maxLength={GUARDA_MAX}
                value={elegida.guarda}
                onChange={(e) => onCambiarGuarda(elegida.id, e.target.value)}
              />
              <Button type="button" size="sm" variant="danger" onClick={eliminarElegida}>
                Eliminar flecha
              </Button>
            </>
          )}
          {/* En su propia línea y con dos líneas reservadas: si el texto cambia de largo, el lienzo no salta. */}
          <p className="min-h-8 basis-full text-xs text-muted-foreground" aria-live="polite">
            {conectando
              ? origen
                ? `Origen: ${nombre(origen)}. Elegí el elemento de destino.`
                : "Elegí el elemento de origen. Para cancelar, volvé a hacer clic en “Conectar elementos”."
              : elegida
                ? "La guarda es una condición opcional: se muestra entre corchetes sobre la flecha."
                : "Arrastrá un elemento (o usá las flechas del teclado) para moverlo, o el fondo para desplazar el diagrama; la rueda del mouse lo acerca o aleja. Doble clic o Enter abre el diagrama interno de una actividad."}
          </p>
        </div>
      )}

      {/* H5: sin barras de desplazamiento. overflow-clip (y no hidden) para que el
          navegador no desplace el recuadro por su cuenta al enfocar un nodo. */}
      <div
        ref={recuadro}
        className={cn(
          "relative h-[30rem] touch-none select-none overflow-clip rounded-[var(--radius)] border bg-muted",
          paneo ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={alPresionarFondo}
        onPointerMove={alMoverFondo}
        onPointerUp={() => setPaneo(null)}
        onPointerCancel={() => setPaneo(null)}
      >
        <div
          role="group"
          aria-label={`Diagrama ${titulo}`}
          className="absolute left-0 top-0 origin-top-left"
          // La vista (desplazamiento y acercamiento) es un valor de runtime.
          style={{ width: ancho, height: alto, transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})` }}
        >
          {/* H17: el cuerpo de cada carril, detrás de todo. Arrastrarlo desplaza la vista. */}
          {franjas.map((c) => (
            <div
              key={c.id}
              aria-hidden="true"
              className={cn("absolute top-0 border-x-2 bg-card/60", carrilElegido === c.id ? "border-primary" : "border-slate-300")}
              style={{ left: c.x, width: c.ancho, height: alto }}
            />
          ))}

          <svg className="absolute inset-0 text-slate-500" width={ancho} height={alto} aria-hidden={flechas.length === 0}>
            <defs>
              <marker id="punta-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {flechas.map((f) => {
              const t = trazo(f);
              if (!t) return null;
              const activa = flechaElegida === f.id || flechaResaltada === f.id;
              return (
                <g
                  key={f.id}
                  role="button"
                  tabIndex={soloLectura ? -1 : 0}
                  aria-label={`Flecha de ${nombre(f.origenId)} a ${nombre(f.destinoId)}${f.guarda ? `, guarda ${f.guarda}` : ""}`}
                  aria-pressed={flechaElegida === f.id}
                  className={cn("outline-none", activa ? "text-primary" : "text-slate-500")}
                  onClick={() => !soloLectura && setFlechaElegida(f.id)}
                  onKeyDown={(e) => {
                    if (soloLectura) return;
                    if (e.key === "Enter" || e.key === " ") setFlechaElegida(f.id);
                    if (e.key === "Delete" || e.key === "Backspace") onEliminarFlecha(f.id);
                  }}
                >
                  <path d={t.d} fill="none" stroke="transparent" strokeWidth={14} className="cursor-pointer" />
                  <path
                    d={t.d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={activa ? 3 : 2}
                    markerEnd="url(#punta-flecha)"
                    className={cn(flechaResaltada === f.id && "animate-pulse")}
                  />
                  {f.guarda && (
                    // El trazo del color del fondo detrás del texto lo separa de la línea.
                    <text
                      x={t.etiqueta.x}
                      y={t.etiqueta.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      paintOrder="stroke"
                      stroke="var(--muted)"
                      strokeWidth={4}
                      fill="currentColor"
                      className="cursor-pointer text-xs font-medium"
                    >
                      [{f.guarda}]
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* H17: la cabecera y los bordes de cada carril van sobre las flechas (si no,
              el lienzo de las flechas se queda con el clic) y debajo de los nodos. */}
          {franjas.map((c) => {
            const elegido = carrilElegido === c.id;
            const gestos = {
              onPointerMove: alMoverCarril,
              onPointerUp: alSoltarCarril,
              onPointerCancel: () => setArrastreCarril(null),
            };
            return (
              <Fragment key={c.id}>
                <button
                  type="button"
                  aria-label={`Carril ${c.nombre}`}
                  aria-pressed={elegido}
                  // El nombre se corta si no entra; el título lo muestra completo.
                  title={c.nombre}
                  className={cn(
                    "absolute top-0 flex touch-none select-none items-center justify-center border-x-2 border-b-2 px-2 text-sm font-semibold",
                    elegido ? "border-primary bg-secondary text-secondary-foreground" : "border-slate-300 bg-card text-foreground",
                    soloLectura ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
                  )}
                  style={{ left: c.x, width: c.ancho, height: ALTO_CABECERA_CARRIL }}
                  onPointerDown={(e) => alPresionarCarril(e, c, "mover")}
                  {...gestos}
                  onClick={() => alClickCarril(c.id)}
                  onKeyDown={(e) => alTeclaCarril(e, c)}
                >
                  <span className="truncate">{c.nombre}</span>
                </button>
                {/* Cada borde se agarra del lado de adentro del carril: con dos carriles
                    pegados, cada uno conserva su propio borde en la línea que comparten. */}
                {!soloLectura &&
                  (["izquierda", "derecha"] as const).map((lado) => (
                    <div
                      key={lado}
                      data-borde-carril=""
                      aria-hidden="true"
                      className="absolute top-0 w-2 cursor-ew-resize touch-none"
                      style={{ left: lado === "izquierda" ? c.x : c.x + c.ancho - 8, height: alto }}
                      onPointerDown={(e) => alPresionarCarril(e, c, lado)}
                      {...gestos}
                    />
                  ))}
              </Fragment>
            );
          })}

          {nodos.map((n) => {
            const p = posiciones.get(n.id) ?? { x: n.x, y: n.y };
            const control = esNodoDeControl(n.tipo);
            const { ancho: w, alto: h } = tamanios[n.tipo];
            const comun = {
              type: "button" as const,
              "aria-pressed": seleccionado === n.id,
              style: { left: p.x, top: p.y, width: w, height: h },
              onPointerDown: (e: PointerEvent<HTMLButtonElement>) => alPresionar(e, n),
              onPointerMove: alMover,
              onPointerUp: alSoltar,
              onPointerCancel: () => setArrastre(null),
              onClick: () => alClick(n.id),
              onDoubleClick: () => abrir(n),
              onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => alTeclaNodo(e, n),
              onFocus: (e: FocusEvent<HTMLButtonElement>) => alEnfocar(e, n),
            };
            // El fondo muestra la mano de desplazar: cada nodo tiene su propio cursor.
            const cursor = cn(
              "touch-none select-none",
              soloLectura && "cursor-pointer",
              !soloLectura && !conectando && "cursor-grab active:cursor-grabbing",
              conectando && "cursor-crosshair",
            );
            if (control) {
              return (
                <button
                  key={n.id}
                  {...comun}
                  aria-label={etiquetaTipoNodo[n.tipo]}
                  title={etiquetaTipoNodo[n.tipo]}
                  className={cn(
                    "absolute flex items-center justify-center rounded-md",
                    seleccionado === n.id ? "text-primary ring-2 ring-primary ring-offset-2 ring-offset-muted" : "text-foreground",
                    origen === n.id && "ring-4 ring-primary/40",
                    cursor,
                  )}
                >
                  {forma(n.tipo)}
                </button>
              );
            }
            return (
              <button
                key={n.id}
                {...comun}
                aria-label={`Actividad ${n.nombre}`}
                // El nombre se corta a dos líneas; el título lo muestra completo.
                title={n.nombre}
                className={cn(
                  "absolute flex items-center justify-center rounded-[var(--radius)] border-2 bg-card px-3 text-center shadow-sm",
                  seleccionado === n.id ? "border-primary" : "border-input",
                  origen === n.id && "ring-4 ring-primary/40",
                  cursor,
                )}
              >
                <span className="line-clamp-2 text-sm font-semibold">{n.nombre}</span>
              </button>
            );
          })}
        </div>

        {/* Fuera de la vista: el aviso no se desplaza ni se agranda con el diagrama. */}
        {nodos.length === 0 && carriles.length === 0 && (
          <p className="pointer-events-none absolute left-6 top-6 max-w-sm text-sm text-muted-foreground">
            {soloLectura
              ? "Este diagrama no tiene actividades."
              : "Este diagrama todavía no tiene actividades. Creá la primera con la figura “Actividad” de la barra de herramientas."}
          </p>
        )}
      </div>
    </div>
  );
}
