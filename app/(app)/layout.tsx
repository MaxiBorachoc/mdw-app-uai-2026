import { redirect } from "next/navigation";
import { obtenerUsuario } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect("/login");

  return <div className="min-h-screen bg-background">{children}</div>;
}
