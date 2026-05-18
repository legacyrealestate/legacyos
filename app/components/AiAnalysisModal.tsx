"use client";

export default function AiAnalysisModal({
  open,
  onClose,
  data,
}: any) {

  if (!open) return null;

  const analysis =
    data?.analysis || {};

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">

      {/* BACKDROP */}

      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* MODAL */}

      <div className="relative z-[1000] w-full max-w-5xl rounded-[40px] bg-white border border-black/[0.06] p-8 max-h-[90vh] overflow-y-auto shadow-2xl">

        <div className="flex items-start justify-between gap-5">

          <div>

            <p className="uppercase tracking-[0.25em] text-zinc-400 text-[10px]">
              Operational Intelligence
            </p>

            <h2 className="text-[38px] font-semibold tracking-tight mt-4">
              AI Analysis
            </h2>

          </div>

          <button
            onClick={onClose}
            className="h-[42px] w-[42px] rounded-full border border-black/[0.06]"
          >
            ✕
          </button>

        </div>

        {/* GRID */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">

          <AnalysisCard
            title="Urgency"
            value={
              analysis.urgency ||
              data?.urgency ||
              "Medium"
            }
          />

          <AnalysisCard
            title="Legal Risk"
            value={
              analysis.legalRisk ||
              "Moderate"
            }
          />

          <AnalysisCard
            title="Severity"
            value={
              analysis.severity ||
              "Infrastructure Risk Possible"
            }
          />

          <AnalysisCard
            title="Tenant Sentiment"
            value={
              analysis.tenantSentiment ||
              "Concerned"
            }
          />

          <AnalysisCard
            title="Estimated Cost"
            value={
              analysis.estimatedCost ||
              "$1,500 - $6,000"
            }
          />

          <AnalysisCard
            title="Vendor Recommendation"
            value={
              analysis.vendorRecommendation ||
              "General Maintenance"
            }
          />

        </div>

        {/* SUMMARY */}

        <div className="rounded-[32px] border border-black/[0.06] bg-[#fafafa] p-8 mt-8">

          <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
            AI Operational Intelligence
          </p>

          <p className="text-zinc-700 text-[15px] leading-relaxed whitespace-pre-wrap mt-5">
            {
              analysis.summary ||
              data?.ai_summary ||
              "LegacyOS analyzed this infrastructure issue and determined operational follow-up may be required."
            }
          </p>

        </div>

      </div>

    </div>
  );
}

function AnalysisCard({
  title,
  value,
}: any) {

  return (
    <div className="rounded-[30px] border border-black/[0.06] bg-[#fafafa] p-7 hover:scale-[1.01] transition-all duration-300 ease-out">

      <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
        {title}
      </p>

      <p className="text-[18px] font-medium mt-5">
        {value}
      </p>

    </div>
  );
}