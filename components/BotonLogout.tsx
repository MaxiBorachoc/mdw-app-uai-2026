/** Cierre de sesión con Server Action, sin estado de cliente. */
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export function BotonLogout() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <Button type="submit" variant="outline" size="sm">
        Cerrar sesión
      </Button>
    </form>
  );
}
