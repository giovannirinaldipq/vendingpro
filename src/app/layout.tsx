import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Vending Pro · Gestão inteligente para vending machines",
  description: "Controle de máquinas, vendas e operação em tempo real para franqueadoras de vending.",
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/brand/vending-pro-icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/vending-pro-icon-128.png", type: "image/png", sizes: "128x128" },
    ],
    apple: [
      { url: "/brand/vending-pro-icon-512.png", sizes: "512x512" },
    ],
    shortcut: "/brand/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrains.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
