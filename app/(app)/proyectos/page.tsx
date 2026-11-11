import { BuscadorProyectos } from "@/components/BuscadorProyectos";
import { FormularioProyecto } from "@/components/FormularioProyecto";
import { Navegacion } from "@/components/Navegacion";
import { SinDatos } from "@/components/SinDatos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requerirUsuario } from "@/lib/auth";
import { listarProyectosParaVista } from "@/lib/db/vistas-proyectos";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const usuario = await requerirUsuario();
  const proyectos = await listarProyectosParaVista(usuario.id);

  const proyectosParaCliente = proyectos.map((proyecto) => ({
    id: proyecto.id,
    nombre: proyecto.nombre,
    descripcion: proyecto.descripcion,
    ownerNombre: proyecto.owner.nombre,
    rol: proyecto.rol,
  }));

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

        <section aria-labelledby="nuevo-proyecto" className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle id="nuevo-proyecto">Nuevo proyecto</CardTitle>
              <CardDescription>Quedás como Dueño del proyecto que crees y podés invitar colaboradores.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormularioProyecto />
            </CardContent>
          </Card>
        </section>

        {proyectosParaCliente.length === 0 ? (
          <SinDatos
            titulo="Todavía no tenés proyectos"
            descripcion="Creá el primero con el formulario de arriba, o aceptá una invitación para colaborar en uno existente."
          />
        ) : (
          <BuscadorProyectos proyectos={proyectosParaCliente} />
        )}
      </main>
    </>
  );
}
