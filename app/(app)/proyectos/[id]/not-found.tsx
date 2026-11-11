import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonStyles } from "@/components/ui/button";

export default function ProyectoNoEncontrado() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <Alert variant="warning">
        <p className="font-semibold">Proyecto no encontrado</p>
        <p className="mt-1">
          El proyecto no existe o no tenés acceso. Por seguridad ambos casos muestran el mismo mensaje.
        </p>
      </Alert>
      <Link href="/proyectos" className={buttonStyles({ variant: "outline", className: "mt-4" })}>
        Volver a proyectos
      </Link>
    </main>
  );
}
