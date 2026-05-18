export default function OperationsBoard() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">

      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">

        <div>

          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Legacy AI Operations
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Autonomous operational intelligence.
          </p>
        </div>

        <div className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-sm font-medium text-indigo-600">
          Monitoring
        </div>
      </div>

      <div className="space-y-5 p-6">

        <div className="rounded-3xl border border-zinc-200 bg-[#fafafa] p-5">

          <div className="flex items-start justify-between">

            <div>

              <div className="flex items-center gap-2">

                <h3 className="text-lg font-medium text-zinc-900">
                  Inbound Voice Handled
                </h3>

                <span className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500">
                  ID: 8829
                </span>
              </div>

              <p className="mt-4 leading-relaxed text-zinc-600">
                AI received emergency maintenance request from Sarah Jenkins regarding a kitchen water leak.
              </p>
            </div>

            <span className="text-sm text-zinc-400">
              Just now
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">

            <span className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
              Urgent
            </span>

            <span className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              Vendor Assigned
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-[#fafafa] p-5">

          <div className="flex items-start justify-between">

            <div>

              <h3 className="text-lg font-medium text-zinc-900">
                Lease Renewal Automation
              </h3>

              <p className="mt-4 leading-relaxed text-zinc-600">
                AI generated and delivered lease renewal package with optimized pricing adjustments.
              </p>
            </div>

            <span className="text-sm text-zinc-400">
              14m ago
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-[#fafafa] p-5">

          <div className="flex items-start justify-between">

            <div>

              <h3 className="text-lg font-medium text-zinc-900">
                Qualified Leasing Lead
              </h3>

              <p className="mt-4 leading-relaxed text-zinc-600">
                AI voice system converted inbound prospect inquiry into scheduled property showing.
              </p>
            </div>

            <span className="text-sm text-zinc-400">
              28m ago
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}