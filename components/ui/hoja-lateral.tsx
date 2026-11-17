"use client";

/**
 * Panel que se desliza desde la izquierda, sobre el elemento nativo <dialog> (como
 * dialog.tsx): el navegador resuelve el foco atrapado, el cierre con Escape y el
 * fondo inerte. El contenido solo existe mientras está abierto.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HojaLateral({
  abierto,
  titulo,
  onCerrar,
  children,
  className,
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const hoja = ref.current;
    if (!hoja) return;
    if (abierto && !hoja.open) hoja.showModal();
    if (!abierto && hoja.open) hoja.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      // Un clic en el fondo (fuera del contenido) también la cierra.
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
      aria-label={titulo}
      className={cn(
        // Pegada a la izquierda y de alto completo: el <dialog> nativo se centra con margin auto.
        "m-0 mr-auto h-dvh max-h-dvh w-[min(20rem,85vw)] max-w-none border-r bg-background p-0 text-foreground shadow-xl",
        "backdrop:bg-slate-900/40",
        className,
      )}
    >
      {abierto && (
        <div className="flex h-full flex-col gap-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{titulo}</h2>
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cerrar
            </button>
          </div>
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      )}
    </dialog>
  );
}
