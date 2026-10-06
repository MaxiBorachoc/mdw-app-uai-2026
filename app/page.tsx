/**
 * Home del proyecto: lista los proyectos del usuario logueado.
 *
 * Esto es un Server Component: corre en el servidor, puede leer de la base
 * directamente y nunca llega al navegador.
 */
import { BotonLogin } from "@/components/BotonLogin";
import { BotonLogout } from "@/components/BotonLogout";
import { FormularioProyecto } from "@/components/FormularioProyecto";
import { obtenerUsuario } from "@/lib/auth";
import { listarProyectosDe } from "@/lib/db/proyectos";

// Esta página lee datos que cambian, así que se renderiza en cada request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const usuario = await obtenerUsuario();

  // La primera vez que se levanta el proyecto todavía no hay base configurada.
  // En vez de reventar con un error de Prisma en la cara, se muestra qué falta.
  let proyectos: Awaited<ReturnType<typeof listarProyectosDe>> | null = null;
  let faltaConectarBase = false;

  if (usuario) {
    try {
      proyectos = await listarProyectosDe(usuario.id);
    } catch {
      faltaConectarBase = true;
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documentación Versionada</h1>
          <p className="mt-2 text-sm opacity-70">
            Equipo: Maxi Borachoc, Enzo Cornejo, Gabriel Colombano, Benjamin Bodrero.
          </p>
        </div>
        {usuario ? (
          <div className="flex shrink-0 flex-col items-end gap-2">
            <p className="text-sm opacity-70">{usuario.nombre}</p>
            <BotonLogout />
          </div>
        ) : (
          <BotonLogin />
        )}
      </div>

      {faltaConectarBase ? (
        <section className="mt-8 rounded-lg border border-dashed p-6">
          <h2 className="text-lg font-semibold">Falta conectar la base de datos</h2>
          <p className="mt-2 text-sm opacity-80">
            El proyecto levanta, pero todavía no puede leer datos. Revisá{" "}
            <code>DATABASE_URL</code> y <code>DIRECT_URL</code> en <code>.env.local</code>.
          </p>
        </section>
      ) : !usuario ? (
        <section className="mt-8 rounded-lg border border-dashed p-6">
          <h2 className="text-lg font-semibold">Iniciá sesión para ver tus proyectos</h2>
          <p className="mt-2 text-sm opacity-80">
            Usá el botón de arriba para entrar con tu cuenta de Google.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-8 rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Nuevo proyecto</h2>
            <div className="mt-4">
              <FormularioProyecto />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Tus proyectos</h2>
            {proyectos && proyectos.length === 0 ? (
              <p className="mt-4 text-sm opacity-70">Todavía no creaste ningún proyecto.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {proyectos?.map((proyecto) => (
                  <li key={proyecto.id} className="rounded-lg border p-4">
                    <h3 className="font-medium">{proyecto.nombre}</h3>
                    {proyecto.descripcion && (
                      <p className="mt-1 text-sm opacity-80">{proyecto.descripcion}</p>
                    )}
                    <p className="mt-2 text-xs opacity-60">creado por {proyecto.owner.nombre}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
