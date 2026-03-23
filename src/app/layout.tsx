import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Proposal AI - AI 제안서 생성기",
  description: "URL을 입력하면 AI가 자동으로 제안서를 생성합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-screen flex antialiased" suppressHydrationWarning>
        <Sidebar />
        <main className="flex-1 relative overflow-auto">
          <div className="ambient-glow" />
          <div className="relative z-10 p-4 pt-16 md:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
