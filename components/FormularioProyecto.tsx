"use client";

/**
 * Formulario de H1 (crear proyecto). Necesita useActionState para mostrar el
 * error de validacion sin perder lo que el usuario ya escribio. Llama a
 * crearProyectoAction (app/actions/proyectos.ts), que verifica la sesion,
 * valida con Zod y crea el proyecto en el servidor: aca no hay ninguna regla.
 */
import { useActionState } from "react";
import { crearProyectoAction, type EstadoCrearProyecto } from "@/app/actions/proyectos";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const estadoInicial: EstadoCrearProyecto = null;

export function FormularioProyecto() {
  const [estado, accion, enCurso] = useActionState(crearProyectoAction, estadoInicial);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div>
        <label htmlFor="nombre" className="mb-2 block text-sm font-medium">
          Nombre del proyecto
        </label>
        <Input
          id="nombre"
          name="nombre"
          type="text"
          required
          defaultValue={estado?.nombre}
          aria-invalid={estado ? true : undefined}
          aria-describedby={estado ? "error-crear-proyecto" : undefined}
        />
      </div>

      <div>
        <label htmlFor="descripcion" className="mb-2 block text-sm font-medium">
          Descripción (opcional)
        </label>
        <Textarea id="descripcion" name="descripcion" rows={2} defaultValue={estado?.descripcion} />
      </div>

      {estado && (
        <Alert variant="error" id="error-crear-proyecto">
          <p className="font-semibold">No pudimos crear el proyecto</p>
          <p className="mt-1">{estado.error}</p>
        </Alert>
      )}

      <Button type="submit" disabled={enCurso} className="self-start">
        {enCurso ? "Creando…" : "Crear proyecto"}
      </Button>
    </form>
  );
}
