import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agenda de Docentes | Campus",
  description: "Planejamento semanal de aulas, docentes, salas e turmas.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
