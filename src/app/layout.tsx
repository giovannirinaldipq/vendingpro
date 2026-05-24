import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VendingPro · Gestão inteligente para vending machines",
  description: "Saiba quando abastecer, o que está vendendo e se está dando lucro — sem complicação",
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
  manifest: undefined,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1e40af" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
