/**
 * Home del proyecto.
 */
import { listarNotas } from "@/lib/db/notas";

export const dynamic = "force-dynamic";

export default async function Home() {
  let notas: Awaited<ReturnType<typeof listarNotas>> | null = null;

  try {
    notas = await listarNotas();
  } catch {
    notas = null;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Documentación Versionada</h1>
      <p className="mt-2 text-sm opacity-70">
        Equipo: Maxi Borachoc, Enzo Cornejo, Gabriel Colombano.
      </p>
    </main>
  );
}
