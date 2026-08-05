import type { Metadata } from "next";
import { Barlow, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bodyFont = Barlow({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const displayFont = Space_Grotesk({
  variable: "--font-display",
  weight: ["500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEO OT · Ordenes de Trabajo",
  description: "Aplicacion local para generar y gestionar Ordenes de Trabajo del taller SEO.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
