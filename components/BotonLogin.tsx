import { signIn } from "@/auth";

export function BotonLogin() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Iniciar sesión con Google
      </button>
    </form>
  );
}
