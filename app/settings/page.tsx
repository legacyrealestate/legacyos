import UnavailablePanel from "@/app/components/UnavailablePanel";

export default function SettingsPage() {
  return (
    <UnavailablePanel
      title="Settings"
      description="There are no editable runtime settings in the pilot UI. Operational configuration is managed through environment variables and provider dashboards."
    />
  );
}
