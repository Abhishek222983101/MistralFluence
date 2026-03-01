import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import GlobalEffects from "@/components/GlobalEffects";

const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monadfluence — Neural Studio 2060",
  description: "Futuristic AI influencer creation platform interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${inter.variable} antialiased`}>
        <div className="app-shell">
          <GlobalEffects />
          {children}
        </div>
      </body>
    </html>
  );
}
