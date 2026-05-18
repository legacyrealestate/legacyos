export default function AIVisualizer() {
  return (
    <div className="relative flex min-h-[500px] items-center justify-center overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">

      <div className="absolute h-40 w-40 rounded-full border border-indigo-200" />

      <div className="absolute h-24 w-24 rounded-full border border-indigo-200" />

      <div className="absolute h-5 w-5 rounded-full bg-indigo-500 shadow-[0_0_35px_rgba(99,102,241,0.8)]" />

      <div className="absolute left-20 top-16 h-3 w-3 rounded-full bg-indigo-400 shadow-xl" />

      <div className="absolute bottom-24 left-28 h-3 w-3 rounded-full bg-emerald-400 shadow-xl" />

      <div className="absolute right-20 top-28 h-3 w-3 rounded-full bg-fuchsia-400 shadow-xl" />

      <div className="absolute bottom-20 right-24 h-3 w-3 rounded-full bg-sky-400 shadow-xl" />

      <div className="absolute bottom-5 left-5 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">

        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
          Latency
        </p>

        <h3 className="mt-2 text-xl font-semibold text-zinc-900">
          24ms
        </h3>
      </div>

      <div className="absolute bottom-5 right-5 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">

        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
          Throughput
        </p>

        <h3 className="mt-2 text-xl font-semibold text-zinc-900">
          1.2k/s
        </h3>
      </div>
    </div>
  );
}