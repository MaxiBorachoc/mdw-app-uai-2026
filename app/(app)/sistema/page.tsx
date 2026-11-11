import { Navegacion } from "@/components/Navegacion";
import { RolProyectoBadge } from "@/components/RolProyecto";
import { SinDatos } from "@/components/SinDatos";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { requerirUsuario } from "@/lib/auth";

export default async function SistemaPage() {
  const usuario = await requerirUsuario();

  return (
    <>
      <Navegacion usuario={usuario} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary">Galería interna</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Sistema visual</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Esta ruta está detrás de la sesión y permite revisar componentes, contraste, foco y estados sin modificar datos reales.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Botones</CardTitle>
              <CardDescription>Acciones primarias, secundarias y estados deshabilitados.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Primario</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="outline">Contorno</Button>
              <Button disabled>Deshabilitado</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles y estados</CardTitle>
              <CardDescription>El significado siempre aparece escrito, no depende solo del color.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <RolProyectoBadge rol="OWNER" />
              <RolProyectoBadge rol="EDITOR" />
              <RolProyectoBadge rol="READER" />
              <Badge variant="warning">Pendiente</Badge>
              <Badge variant="success">Aceptada</Badge>
              <Badge variant="danger">Rechazada</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campos</CardTitle>
              <CardDescription>Todos los inputs conservan label y foco visible.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="sistema-normal" className="mb-2 block text-sm font-medium">Campo normal</label>
                <Input id="sistema-normal" placeholder="Escribí para probar el foco" />
              </div>
              <div>
                <label htmlFor="sistema-error" className="mb-2 block text-sm font-medium">Campo con error</label>
                <Input id="sistema-error" defaultValue="Dato inválido" aria-invalid="true" aria-describedby="sistema-error-texto" />
                <p id="sistema-error-texto" className="mt-1 text-sm text-destructive">Hay un error y se explica con texto.</p>
              </div>
              <div>
                <label htmlFor="sistema-disabled" className="mb-2 block text-sm font-medium">Campo deshabilitado</label>
                <Input id="sistema-disabled" disabled value="No editable" readOnly />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>Información, éxito, advertencia y error.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>Información para continuar.</Alert>
              <Alert variant="success">La operación terminó correctamente.</Alert>
              <Alert variant="warning">Revisá este dato antes de continuar.</Alert>
              <Alert variant="error">La operación no pudo completarse.</Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cargando</CardTitle>
              <CardDescription>El esqueleto reserva el espacio del contenido y evita saltos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
              <Skeleton className="mt-5 h-10 w-32" />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <SinDatos
              titulo="Estado vacío"
              descripcion="No existe información todavía. Es diferente de una búsqueda sin coincidencias."
            />
            <SinDatos
              titulo="Sin resultados"
              descripcion="Hay información cargada, pero el filtro actual no coincide con ningún elemento."
            />
          </div>
        </div>
      </main>
    </>
  );
}
