import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#050a14] text-white font-sans">
        {children}
      </body>
    </html>
  );
}
