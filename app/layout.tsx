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
