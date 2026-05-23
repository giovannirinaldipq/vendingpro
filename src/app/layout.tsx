import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VendingPro - Gestão Inteligente para Vending Machines",
  description: "Saiba quando abastecer, o que está vendendo, e se está dando lucro — sem complicação",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
