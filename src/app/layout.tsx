import type { Metadata } from "next";
import { Geist_Mono, Karla, Big_Shoulders_Stencil } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bigShouldersStencil = Big_Shoulders_Stencil({
  variable: "--font-big-shoulders-stencil",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Casa Nova",
  description: "Checklist e orçamento para organizar a casa nova do casal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${karla.variable} ${geistMono.variable} ${bigShouldersStencil.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
