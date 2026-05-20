import type { Metadata } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fundación Academia Nacional de Ajedrez",
  description: "Plataforma institucional y administrativa de la Fundación Academia Nacional de Ajedrez.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${montserrat.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-white">
          <div className="max-w-8xl mx-auto px-8">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
