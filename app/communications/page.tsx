import UnavailablePanel from "@/app/components/UnavailablePanel";

export default function CommunicationsPage() {
  return (
    <UnavailablePanel
      title="Communications"
      description="Outbound communications are disabled by default. Vendor and resident notifications require staff approval and the ENABLE_OUTBOUND_COMMUNICATIONS flag before any real SMS can be sent."
    />
  );
}
