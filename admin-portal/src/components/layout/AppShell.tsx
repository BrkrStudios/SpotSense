"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { ParkingDataProvider } from "@/context/ParkingDataContext";
import { AuthProvider } from "@/context/AuthContext";

/**
 * Wraps authenticated pages with Sidebar + data providers.
 * The /login page renders standalone so it doesn't mount the polling
 * ParkingDataProvider or surface sidebar nav to unauthenticated users.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <main
        className="min-h-screen"
        style={{ backgroundColor: "var(--asphalt)" }}
      >
        {children}
      </main>
    );
  }

  return (
    <AuthProvider>
      <ParkingDataProvider>
        <Sidebar />
        <main
          className="md:ml-[220px] min-h-screen"
          style={{ backgroundColor: "var(--asphalt)" }}
        >
          {children}
        </main>
      </ParkingDataProvider>
    </AuthProvider>
  );
}
