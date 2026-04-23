"use client";

import { useAuth } from "@/context/AuthContext";

export default function SecuritySettings() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const memberSinceText = formatMemberSince(user.memberSince);

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        Account
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Signed in as the admin user.
      </p>

      {/* Profile card */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          {user.username.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {user.username}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Member since {memberSinceText}
          </p>
        </div>
        <button
          onClick={logout}
          className="text-[11px] px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
          style={{
            backgroundColor: "var(--sidebar)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function formatMemberSince(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}
