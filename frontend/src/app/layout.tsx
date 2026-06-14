import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Project Zenith — The Celestial Eye",
  description:
    "Real-time cosmic radar: see what's directly above any location on Earth. Track the ISS, satellites, planets, and constellations overhead.",
  keywords: [
    "astronomy",
    "ISS tracker",
    "satellite",
    "zenith",
    "cosmic radar",
    "space",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#050a14] text-white font-[family-name:var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
