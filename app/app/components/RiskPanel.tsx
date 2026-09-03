export default function RiskPanel() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-6 py-5">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Portfolio Risk
        </h2>
      </div>

      <div className="p-5">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
          Portfolio risk scoring is not connected for the supervised pilot.
        </div>
      </div>
    </div>
  );
}
