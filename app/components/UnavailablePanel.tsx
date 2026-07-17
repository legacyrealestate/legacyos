import AppShell from "@/app/components/AppShell";

export default function UnavailablePanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AppShell>
      <section className="rounded-[24px] border border-black/[0.06] bg-white p-6 md:p-8">
        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Not Connected In Pilot
        </p>
        <h1 className="text-[36px] md:text-[48px] font-semibold tracking-tight mt-4">
          {title}
        </h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5 max-w-3xl">
          {description}
        </p>
      </section>
    </AppShell>
  );
}
