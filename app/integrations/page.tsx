import UnavailablePanel from "@/app/components/UnavailablePanel";

export default function IntegrationsPage() {
  return (
    <UnavailablePanel
      title="Integrations"
      description="Buildium and other external integrations are not connected. LegacyOS will not claim synchronization until credentials, scopes, and verified jobs are implemented."
    />
  );
}
