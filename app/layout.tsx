import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Media Converter",
  description:
    "Convert video and audio locally — MP4, MP3, WAV, WebM, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body
        style={
          {
            "--font-body": "var(--font-dm-sans), 'Segoe UI', sans-serif",
            "--font-display": "var(--font-fraunces), Georgia, serif",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
