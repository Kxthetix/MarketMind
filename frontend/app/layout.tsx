import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketMind AI - Indian Stock Intelligence Platform",
  description: "Real-time AI-powered stock intelligence, technical metrics, pattern recognition, news sentiment, and backtesting for NSE/BSE markets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-[#04060d] text-slate-100">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full relative z-10">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
