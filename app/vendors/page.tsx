"use client";

import AppShell from "@/app/components/AppShell";

const vendors = [

  {
    name:
      "Nashville Emergency Plumbing",
    specialty:
      "Emergency Plumbing",
    workload:
      "32%",
    availability:
      "Available",
  },

  {
    name:
      "Legacy HVAC Services",
    specialty:
      "HVAC",
    workload:
      "68%",
    availability:
      "Busy",
  },

  {
    name:
      "Downtown Electrical",
    specialty:
      "Electrical",
    workload:
      "18%",
    availability:
      "Available",
  },

];

export default function VendorsPage() {

  return (
    <AppShell>

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.25em] text-zinc-400 text-[10px]">
          Vendor Infrastructure
        </p>

        <h1 className="text-[58px] font-semibold tracking-tight mt-5">
          Vendor Network
        </h1>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

        {vendors.map(
          (
            vendor,
            index
          ) => (

            <div
              key={index}
              className="rounded-[34px] border border-black/[0.06] bg-white p-8"
            >

              <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                {vendor.specialty}
              </p>

              <h2 className="text-[28px] font-semibold mt-5">
                {vendor.name}
              </h2>

              <p className="text-zinc-500 text-[14px] mt-3">
                Workload: {vendor.workload}
              </p>

              <div className="h-[34px] px-5 rounded-full bg-black text-white text-[10px] inline-flex items-center justify-center mt-6">
                {vendor.availability}
              </div>

            </div>

          )
        )}

      </div>

    </AppShell>
  );
}