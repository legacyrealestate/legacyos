export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">

      <div className="flex flex-col items-center gap-6">

        {/* ORB */}
        <div className="relative flex h-32 w-32 items-center justify-center">

          <div className="absolute h-28 w-28 animate-pulse rounded-full border border-indigo-200" />

          <div className="absolute h-20 w-20 animate-pulse rounded-full border border-indigo-300" />

          <div className="absolute h-10 w-10 rounded-full bg-indigo-100 blur-xl" />

          <div className="relative h-4 w-4 rounded-full bg-indigo-500 shadow-[0_0_35px_rgba(99,102,241,0.8)]" />
        </div>

        {/* TEXT */}
        <div className="text-center">

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Initializing LegacyOS
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Synchronizing cognitive infrastructure...
          </p>
        </div>
      </div>
    </main>
  );
}