import type { Metadata } from "next";
import "./globals.css";
import "./appearance.css";
import "./local-auth.css";
import "./budget.css";
import { appearanceBootstrap } from './appearance';

export const metadata: Metadata = {
  title: "Estrelas • Central de Compras",
  description: "Central de compras do Colégio Estrelas. Solicitações, aprovações e cotações em um só lugar.",
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:appearanceBootstrap}}/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
