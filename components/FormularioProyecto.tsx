"use client";

import { useActionState } from "react";
import { crearProyectoAction, type EstadoCrearProyecto } from "@/app/actions/proyectos";

const estadoInicial: EstadoCrearProyecto = null;

export function FormularioProyecto() {
  const [estado, accion, enCurso] = useActionState(crearProyectoAction, estadoInicial);

  return (
    <form action={accion} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre del proyecto
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          aria-invalid={estado ? true : undefined}
          aria-describedby={estado ? "error-crear-proyecto" : undefined}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="descripcion" className="text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {estado && (
        <p id="error-crear-proyecto" role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={enCurso}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {enCurso ? "Creando…" : "Crear proyecto"}
      </button>
    </form>
  );
}
