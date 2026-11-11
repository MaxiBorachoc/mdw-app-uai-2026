import { redirect } from "next/navigation";
import { BotonLogin } from "@/components/BotonLogin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerUsuario } from "@/lib/auth";

export default async function LoginPage() {
  const usuario = await obtenerUsuario();
  if (usuario) redirect("/proyectos");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="text-sm font-semibold text-primary">MDW · UAI 2026</p>
          <CardTitle>Documentación Versionada</CardTitle>
          <CardDescription>
            Iniciá sesión para consultar tus proyectos, colaboradores y versiones de documentación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BotonLogin />
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            La identidad se valida con Google. Los permisos se asignan por proyecto y se controlan en el servidor.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
