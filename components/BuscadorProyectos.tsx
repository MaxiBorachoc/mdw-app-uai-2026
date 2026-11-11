"use client";

import { useMemo, useState } from "react";
import type { ProyectoListado } from "@/components/TarjetaProyecto";
import { SinDatos } from "@/components/SinDatos";
import { TarjetaProyecto } from "@/components/TarjetaProyecto";
import { Input } from "@/components/ui/input";

export function BuscadorProyectos({ proyectos }: { proyectos: ProyectoListado[] }) {
  const [termino, setTermino] = useState("");

  const normalizado = termino.trim().toLocaleLowerCase("es-AR");
  const filtrados = useMemo(() => {
    if (!normalizado) return proyectos;

    return proyectos.filter((proyecto) =>
      [proyecto.nombre, proyecto.descripcion, proyecto.ownerNombre]
        .join(" ")
        .toLocaleLowerCase("es-AR")
        .includes(normalizado),
    );
  }, [normalizado, proyectos]);

  return (
    <section aria-labelledby="proyectos-listado">
      <div className="mb-5 max-w-xl">
        <label htmlFor="buscar-proyecto" className="mb-2 block text-sm font-medium">
          Buscar proyectos
        </label>
        <Input
          id="buscar-proyecto"
          type="search"
          value={termino}
          onChange={(event) => setTermino(event.target.value)}
          placeholder="Nombre, descripción o propietario"
          autoComplete="off"
        />
      </div>

      <h2 id="proyectos-listado" className="sr-only">
        Listado de proyectos
      </h2>

      {filtrados.length === 0 ? (
        <SinDatos
          titulo={`No encontramos proyectos${termino.trim() ? ` para “${termino.trim()}”` : ""}`}
          descripcion="Tenés proyectos cargados, pero ninguno coincide con la búsqueda. Probá con otro término."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((proyecto) => (
            <li key={proyecto.id}>
              <TarjetaProyecto proyecto={proyecto} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
