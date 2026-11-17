"use client";

/**
 * Ventana modal sobre el elemento nativo <dialog>: el navegador ya resuelve el
 * foco atrapado adentro, el cierre con Escape y el fondo inerte.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Dialog({
  abierto,
  titulo,
  descripcion,
  onCerrar,
  children,
  className,
}: {
  abierto: boolean;
  titulo: string;
  descripcion?: string;
  onCerrar: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      aria-labelledby="dialogo-titulo"
      className={cn(
        // m-auto: el reset de Tailwind le quita al <dialog> el margen que lo centra.
        "m-auto max-h-[calc(100vh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-auto rounded-[var(--radius)] border bg-card p-0 text-card-foreground shadow-xl",
        "backdrop:bg-slate-900/40",
        className,
      )}
    >
      {abierto && (
        <div className="flex flex-col gap-4 p-5">
          <div>
            <h2 id="dialogo-titulo" className="text-lg font-semibold tracking-tight">
              {titulo}
            </h2>
            {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
