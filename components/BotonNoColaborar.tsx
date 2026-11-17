"use client";

/**
 * H2: "No colaborar". Un colaborador con invitación aceptada deja un proyecto
 * ajeno: pierde el acceso y el dueño recibe un correo. El servidor vuelve a
 * verificar que solo se pueda quitar a sí mismo.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BotonNoColaborar({
  proyectoId,
  proyectoNombre,
  usuarioId,
}: {
  proyectoId: string;
  proyectoNombre: string;
  usuarioId: string;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dejar = async () => {
    if (!window.confirm(`¿Dejar de colaborar en “${proyectoNombre}”? Vas a perder el acceso al proyecto.`)) return;
    setOcupado(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/proyectos/${proyectoId}/miembros/${usuarioId}`, { method: "DELETE" });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        setError(datos?.error ?? "No se pudo completar. Probá de nuevo en unos segundos.");
        return;
      }
      router.refresh();
    } catch {
      setError("Revisá tu conexión y probá de nuevo.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={ocupado} onClick={dejar}>
        No colaborar
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
