/**
 * Botón de login con Google. Sigue siendo Server Component: la acción se
 * ejecuta en el servidor y el botón solo usa el componente visual compartido.
 */
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export function BotonLogin() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <Button type="submit">Iniciar sesión con Google</Button>
    </form>
  );
}
