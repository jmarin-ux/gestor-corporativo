import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: "CORPOPS | Console",
  description: "Sistema de Gestión",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* 1. Quitamos 'dark' y dejamos el html limpio */
    <html lang="es">
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased bg-slate-50 text-slate-800`}>
        
        {/* 2. Decoración de fondo "Flight App" (Sutil y limpia) */}
        {/* Mancha azul pastel arriba a la derecha */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-blue-100/50 blur-[120px] rounded-full pointer-events-none -z-10 translate-x-1/3 -translate-y-1/3" />
        
        {/* Mancha índigo pastel abajo a la izquierda */}
        <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/40 blur-[100px] rounded-full pointer-events-none -z-10 -translate-x-1/3 translate-y-1/3" />

        {children}
      </body>
    </html>
  );
}