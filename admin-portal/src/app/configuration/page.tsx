"use client";

import Header from "@/components/layout/Header";
import AppearanceSettings from "@/components/configuration/AppearanceSettings";
import AlertPreferences from "@/components/configuration/AlertPreferences";

export default function ConfigurationPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Configuration" subtitle="Visual and alert preferences" />

      <div className="flex-1 p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AppearanceSettings />
          <AlertPreferences />
        </div>
      </div>
    </div>
  );
}
