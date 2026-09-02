import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoManager Enterprise | Geolocalização e Mapeamento Corporativo",
  description: "Sistema avançado de geolocalização e gestão de rede da GeoManager Enterprise",
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
