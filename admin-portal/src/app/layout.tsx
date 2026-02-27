import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SpotSense Admin Portal",
  description: "Parking sensor management dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Sidebar />
        <main className="ml-[220px] min-h-screen" style={{ backgroundColor: "var(--asphalt)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
