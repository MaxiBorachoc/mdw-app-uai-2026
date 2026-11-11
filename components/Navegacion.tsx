import Link from "next/link";
import type { RolProyecto } from "@prisma/client";
import type { UsuarioSesion } from "@/lib/auth";
import { BotonLogout } from "@/components/BotonLogout";
import { RolProyectoBadge } from "@/components/RolProyecto";

export function Navegacion({
  usuario,
  rol,
}: {
  usuario: UsuarioSesion;
  rol?: RolProyecto;
}) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/proyectos" className="font-semibold tracking-tight text-foreground">
            Documentación Versionada
          </Link>
          <nav aria-label="Navegación principal" className="flex items-center gap-4 text-sm">
            <Link href="/proyectos" className="text-muted-foreground hover:text-primary">
              Proyectos
            </Link>
            <Link href="/sistema" className="text-muted-foreground hover:text-primary">
              Sistema visual
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-medium">{usuario.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>
          </div>
          {rol ? (
            <RolProyectoBadge rol={rol} />
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Rol según proyecto</span>
          )}
          <BotonLogout />
        </div>
      </div>
    </header>
  );
}
