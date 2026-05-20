import type { Metadata } from "next";
import { Archivo_Black, DM_Sans, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const fontUi = DM_Sans({
  variable: "--font-verge-ui",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const fontDisplay = Archivo_Black({
  variable: "--font-verge-display",
  subsets: ["latin"],
  weight: "400",
});

const fontMono = JetBrains_Mono({
  variable: "--font-verge-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "FAIT",
  description:
    "Dnevnik ishrane i treninga — strukturirani unos preko AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr-Latn" className="h-full scroll-smooth">
      <body
        className={`${fontUi.variable} ${fontDisplay.variable} ${fontMono.variable} theme-verge min-h-full bg-canvas font-sans text-[1.25rem] leading-relaxed text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
