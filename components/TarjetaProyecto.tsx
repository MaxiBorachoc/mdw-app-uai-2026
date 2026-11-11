import Link from "next/link";
import type { RolProyecto } from "@prisma/client";
import { RolProyectoBadge } from "@/components/RolProyecto";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type ProyectoListado = {
  id: string;
  nombre: string;
  descripcion: string;
  ownerNombre: string;
  rol: RolProyecto;
};

export function TarjetaProyecto({ proyecto }: { proyecto: ProyectoListado }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="break-words">{proyecto.nombre}</CardTitle>
            <CardDescription className="mt-1">Creado por {proyecto.ownerNombre}</CardDescription>
          </div>
          <RolProyectoBadge rol={proyecto.rol} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {proyecto.descripcion || "Este proyecto todavía no tiene una descripción."}
        </p>
        <Link
          href={`/proyectos/${proyecto.id}`}
          className={buttonStyles({ variant: "secondary", className: "self-start" })}
        >
          Ver proyecto
        </Link>
      </CardContent>
    </Card>
  );
}
