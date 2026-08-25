import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Localizações IPDA | Geolocalização e Mapeamento Oficial",
  description: "Sistema oficial de geolocalização e gestão da malha de coligações IPDA",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-zinc-900 transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
