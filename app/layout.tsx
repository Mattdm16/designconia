import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DesignConia — Generador curricular",
  description:
    "De OA oficial a secuencia didáctica editable y trazable en minutos."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
