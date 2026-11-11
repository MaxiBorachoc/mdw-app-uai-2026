"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ProyectosError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <Alert variant="error">
        <p className="font-semibold">No pudimos cargar tus proyectos</p>
        <p className="mt-1">Ocurrió un problema inesperado. Podés volver a intentar sin perder tu sesión.</p>
      </Alert>
      <Button type="button" className="mt-4" onClick={reset}>
        Reintentar
      </Button>
    </main>
  );
}
