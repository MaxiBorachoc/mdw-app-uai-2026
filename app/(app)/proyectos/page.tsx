import { Navegacion } from "@/components/Navegacion";
import { TarjetaProyecto } from "@/components/TarjetaProyecto";
import { requerirUsuario } from "@/lib/auth";
import { listarProyectosParaVista } from "@/lib/db/vistas-proyectos";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const usuario = await requerirUsuario();
  const proyectos = await listarProyectosParaVista(usuario.id);

  return (
    <>
      <Navegacion usuario={usuario} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">Espacio de trabajo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Mis proyectos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Consultá la documentación y el rol que tenés dentro de cada proyecto.
          </p>
        </div>

        {proyectos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no tenés proyectos.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proyectos.map((proyecto) => (
              <li key={proyecto.id}>
                <TarjetaProyecto
                  proyecto={{
                    id: proyecto.id,
                    nombre: proyecto.nombre,
                    descripcion: proyecto.descripcion,
                    ownerNombre: proyecto.owner.nombre,
                    rol: proyecto.rol,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
