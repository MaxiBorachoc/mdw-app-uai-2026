import Link from "next/link";
import { notFound } from "next/navigation";
import { Navegacion } from "@/components/Navegacion";
import { RolProyectoBadge } from "@/components/RolProyecto";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requerirUsuario } from "@/lib/auth";
import { obtenerProyectoParaVista } from "@/lib/db/vistas-proyectos";

type Contexto = { params: Promise<{ id: string }> };

const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function ProyectoDetallePage({ params }: Contexto) {
  const usuario = await requerirUsuario();
  const { id } = await params;
  const proyecto = await obtenerProyectoParaVista(id, usuario.id);

  if (!proyecto) notFound();

  const membresiaActual = proyecto.miembros.find((miembro) => miembro.usuario.id === usuario.id);
  if (!membresiaActual) notFound();

  const versionAbierta = proyecto.versiones[0];

  return (
    <>
      <Navegacion usuario={usuario} rol={membresiaActual.rol} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/proyectos" className="text-sm font-medium text-primary hover:underline">
              ← Volver a proyectos
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{proyecto.nombre}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {proyecto.descripcion || "Este proyecto todavía no tiene una descripción."}
            </p>
          </div>
          <RolProyectoBadge rol={membresiaActual.rol} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Información del proyecto</CardTitle>
              <CardDescription>Datos generales visibles para los colaboradores aceptados.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-muted-foreground">Propietario</dt>
                  <dd className="mt-1 font-medium">{proyecto.owner.nombre}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Creado</dt>
                  <dd className="mt-1 font-medium">{formatoFecha.format(proyecto.creadoEn)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Versión actual</dt>
                  <dd className="mt-1">
                    {versionAbierta ? <Badge variant="blue">En desarrollo</Badge> : <Badge variant="warning">Sin versión abierta</Badge>}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Colaboradores activos</dt>
                  <dd className="mt-1 font-medium">{proyecto.miembros.length}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colaboradores</CardTitle>
              <CardDescription>Solo se muestran membresías aceptadas.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proyecto.miembros.map((miembro) => (
                  <li key={miembro.usuario.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{miembro.usuario.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">{miembro.usuario.email}</p>
                    </div>
                    <RolProyectoBadge rol={miembro.rol} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Link href="/proyectos" className={buttonStyles({ variant: "outline" })}>
            Volver al listado
          </Link>
        </div>
      </main>
    </>
  );
}
