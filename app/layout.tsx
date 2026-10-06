/**
 * Layout raiz de Next.js: envuelve toda la app. Hoy solo hay una pagina real
 * (app/page.tsx), asi que este archivo no tiene logica propia mas alla del
 * HTML base y los metadatos.
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Documentación Versionada",
  description:
    "Documentacion versionada de proyectos de software — Metodologias de Desarrollo Web, UAI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
