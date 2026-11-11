import { redirect } from "next/navigation";
import { obtenerUsuario } from "@/lib/auth";

/** Entrada única: deriva a la sección pública o autenticada. */
export default async function Home() {
  const usuario = await obtenerUsuario();
  redirect(usuario ? "/proyectos" : "/login");
}
