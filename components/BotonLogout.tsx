import { signOut } from "@/auth";

export function BotonLogout() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
