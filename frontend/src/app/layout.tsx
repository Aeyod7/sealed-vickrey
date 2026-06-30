import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sealed — Vickrey Auctions on FHEVM",
  description:
    "Fully-encrypted second-price sealed-bid auctions on Zama's FHEVM. Every bid stays confidential forever.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-onyx text-snow">
        <div className="atmosphere" />
        <Providers>
          <div className="relative z-10 flex flex-col min-h-screen w-full">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
