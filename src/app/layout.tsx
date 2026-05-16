import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/chat.css";

const inter = Inter({
  variable: "--font-main",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Berkshire Hathaway Intelligence — AI Chat",
  description:
    "Chat with Warren Buffett's shareholder letters using AI. Built with Mastra RAG, Next.js, Neon PostgreSQL, and pgvector.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
