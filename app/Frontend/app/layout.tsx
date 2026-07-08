import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Geist } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guru Tech Store — Portal de Gestión",
  description: "Sistema de gestión para control de inventario, ventas y personal en múltiples sedes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn("h-full", "antialiased", jakartaSans.variable, geistMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col bg-bg-main">
        <TooltipProvider delay={0} closeDelay={0}>
          {children}
          <Toaster richColors position="top-right" toastOptions={{ duration: 1500 }} />
        </TooltipProvider>
      </body>
    </html>
  );
}
