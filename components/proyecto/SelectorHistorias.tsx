"use client";

/**
 * H6: las historias de usuario asociadas a una actividad. Se ven solo las
 * asociadas, como etiquetas en orden alfabético, cada una con una × para quitarla.
 * Debajo, un buscador (cuadro combinado de ARIA) lista las historias vigentes que
 * todavía no están asociadas; al elegir una, se asocia.
 *
 * Teclado: flechas para recorrer la lista, Enter para asociar la marcada y Escape
 * para cerrarla (o, con la lista cerrada, borrar lo escrito).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn, contieneTexto } from "@/lib/utils";

type Historia = { id: string; titulo: string };

const titulo = (h: Historia) => h.titulo || "Historia sin título";
const porTitulo = (a: Historia, b: Historia) => titulo(a).localeCompare(titulo(b), "es");

export function SelectorHistorias({
  prefijo,
  historias,
  asociadas,
  soloLectura,
  onCambiar,
}: {
  prefijo: string;
  historias: Historia[];
  asociadas: string[];
  soloLectura: boolean;
  onCambiar: (historiaIds: string[]) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState(false);
  const [marcada, setMarcada] = useState(0);

  const elegidas = historias.filter((h) => asociadas.includes(h.id)).sort(porTitulo);
  const disponibles = historias.filter((h) => !asociadas.includes(h.id));
  const opciones = disponibles.filter((h) => contieneTexto(titulo(h), busqueda)).sort(porTitulo);
  const indice = Math.min(marcada, opciones.length - 1);
  const idLista = `${prefijo}-historias-opciones`;
  const idOpcion = (i: number) => `${prefijo}-historias-opcion-${i}`;
  const mostrarLista = abierta && disponibles.length > 0;

  // La opción marcada con el teclado se mantiene a la vista dentro de la lista.
  useEffect(() => {
    if (mostrarLista && indice >= 0) document.getElementById(idOpcion(indice))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idOpcion depende solo del prefijo
  }, [indice, mostrarLista]);

  const asociar = (h: Historia) => {
    onCambiar([...asociadas, h.id]);
    setBusqueda("");
    setMarcada(0);
  };
  // La × desaparece con su etiqueta: el foco pasa al buscador para no perderse,
  // sin abrir la lista.
  const buscador = useRef<HTMLInputElement>(null);
  const sinAbrir = useRef(false);
  const quitar = (id: string) => {
    onCambiar(asociadas.filter((x) => x !== id));
    requestAnimationFrame(() => {
      sinAbrir.current = true;
      buscador.current?.focus();
      sinAbrir.current = false;
    });
  };

  const alTecla = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!abierta) return setAbierta(true);
      if (opciones.length === 0) return;
      const paso = e.key === "ArrowDown" ? 1 : -1;
      setMarcada((Math.max(indice, 0) + paso + opciones.length) % opciones.length);
    } else if (e.key === "Enter") {
      // Enter nunca envía nada: si hay una opción marcada, la asocia.
      e.preventDefault();
      const opcion = mostrarLista ? opciones[indice] : undefined;
      if (opcion) asociar(opcion);
    } else if (e.key === "Escape") {
      if (abierta) {
        e.preventDefault();
        setAbierta(false);
      } else if (busqueda) {
        e.preventDefault();
        setBusqueda("");
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {elegidas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {soloLectura ? "Sin historias asociadas." : "Todavía no tiene historias asociadas."}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Historias asociadas">
          {elegidas.map((h) => (
            <li
              key={h.id}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-full bg-secondary py-1 text-sm font-medium text-secondary-foreground",
                soloLectura ? "px-3" : "pl-3 pr-1",
              )}
            >
              <span className="min-w-0 break-words">{titulo(h)}</span>
              {!soloLectura && (
                <button
                  type="button"
                  aria-label={`Quitar ${titulo(h)}`}
                  title={`Quitar ${titulo(h)}`}
                  onClick={() => quitar(h.id)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-blue-100"
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!soloLectura &&
        (disponibles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Todas las historias del proyecto ya están asociadas.</p>
        ) : (
          <div className="relative">
            <input
              ref={buscador}
              id={`${prefijo}-historias-buscar`}
              type="text"
              role="combobox"
              aria-label="Buscar una historia para asociar"
              aria-autocomplete="list"
              aria-expanded={mostrarLista}
              aria-controls={idLista}
              aria-activedescendant={mostrarLista && indice >= 0 ? idOpcion(indice) : undefined}
              autoComplete="off"
              placeholder="Buscar una historia para asociar…"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setMarcada(0);
                setAbierta(true);
              }}
              onFocus={() => !sinAbrir.current && setAbierta(true)}
              onClick={() => setAbierta(true)}
              onBlur={() => setAbierta(false)}
              onKeyDown={alTecla}
              className="h-10 w-full rounded-[var(--radius)] border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
            {mostrarLista && (
              <ul
                id={idLista}
                role="listbox"
                aria-label="Historias para asociar"
                className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-[var(--radius)] border bg-card p-1 shadow-lg"
              >
                {opciones.length === 0 ? (
                  <li role="presentation" className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay historias que coincidan.
                  </li>
                ) : (
                  opciones.map((h, i) => (
                    <li
                      key={h.id}
                      id={idOpcion(i)}
                      role="option"
                      aria-selected={i === indice}
                      // Sin esto, el clic le quita el foco al buscador y la lista se cierra antes de elegir.
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseMove={() => setMarcada(i)}
                      onClick={() => asociar(h)}
                      className={cn(
                        "cursor-pointer break-words rounded-md px-2 py-1.5 text-sm",
                        i === indice ? "bg-muted text-foreground" : "text-foreground",
                      )}
                    >
                      {titulo(h)}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        ))}
    </div>
  );
}
