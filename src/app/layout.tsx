import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JEE/NEET Performance & AI Diagnostics",
  description: "Academic performance tracking and AI diagnostic platform for coaching centers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:pl-64">
            <div className="min-h-screen bg-slate-50 p-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}