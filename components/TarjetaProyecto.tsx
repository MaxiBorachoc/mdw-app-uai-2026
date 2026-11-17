import Link from "next/link";
import type { EstadoProyecto, RolProyecto } from "@prisma/client";
import { BotonNoColaborar } from "@/components/BotonNoColaborar";
import { RolProyectoBadge } from "@/components/RolProyecto";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type ProyectoListado = {
  id: string;
  nombre: string;
  descripcion: string;
  ownerNombre: string;
  rol: RolProyecto;
  estado: EstadoProyecto;
};

export function TarjetaProyecto({ proyecto, usuarioId }: { proyecto: ProyectoListado; usuarioId: string }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="break-words">{proyecto.nombre}</CardTitle>
            <CardDescription className="mt-1">Creado por {proyecto.ownerNombre}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* H15: en proceso o finalizado. */}
            <Badge variant={proyecto.estado === "FINALIZADO" ? "neutral" : "blue"}>
              {proyecto.estado === "FINALIZADO" ? "Finalizado" : "En proceso"}
            </Badge>
            <RolProyectoBadge rol={proyecto.rol} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {proyecto.descripcion || "Este proyecto todavía no tiene una descripción."}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Link href={`/proyectos/${proyecto.id}`} className={buttonStyles({ variant: "secondary" })}>
            Ver proyecto
          </Link>
          {/* H2: en un proyecto ajeno, a la derecha; nunca en los propios. */}
          {proyecto.rol !== "OWNER" && (
            <BotonNoColaborar proyectoId={proyecto.id} proyectoNombre={proyecto.nombre} usuarioId={usuarioId} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
