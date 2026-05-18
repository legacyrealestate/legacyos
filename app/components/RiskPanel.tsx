export default function RiskPanel() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">

      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">

        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Portfolio Risk
        </h2>

        <button className="text-sm font-medium text-indigo-500">
          View All
        </button>
      </div>

      <div className="space-y-4 p-5">

        <div className="rounded-3xl border border-zinc-200 p-4">

          <div className="flex items-start justify-between">

            <div>

              <h3 className="text-lg font-medium text-zinc-900">
                The Harrison
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                450 Units • Financial District
              </p>
            </div>

            <span className="rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
              Risk: 82
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 p-4">

          <div className="flex items-start justify-between">

            <div>

              <h3 className="text-lg font-medium text-zinc-900">
                Vertex Towers
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                320 Units • Midtown
              </p>
            </div>

            <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
              Risk: 12
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 p-4">

          <div className="flex items-start justify-between">

            <div>

              <h3 className="text-lg font-medium text-zinc-900">
                Oakwood Estates
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                120 Units • Suburban
              </p>
            </div>

            <span className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
              Risk: 45
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}