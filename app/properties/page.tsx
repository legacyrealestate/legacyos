"use client";

import { useEffect, useState } from "react";

import AppShell from "@/app/components/AppShell";

export default function PropertiesPage() {

  const [
    properties,
    setProperties,
  ] = useState<any[]>([]);

  useEffect(() => {

    fetch("/api/properties")
      .then((res) => res.json())
      .then((data) =>
        setProperties(data)
      );

  }, []);

  return (
    <AppShell>

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Property Intelligence
        </p>

        <h1 className="text-[56px] font-semibold tracking-tight mt-5">
          Properties
        </h1>

      </div>

      <div className="space-y-5 mt-8">

        {properties.map(
          (property) => (

            <div
              key={property.id}
              className="rounded-[34px] border border-black/[0.06] bg-white p-8"
            >

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-[30px] font-semibold tracking-tight">
                    {
                      property.property_name
                    }
                  </h2>

                  <p className="text-zinc-500 text-[14px] mt-4">
                    {
                      property.address
                    }
                  </p>

                  <div className="grid grid-cols-2 gap-6 mt-6">

                    <div>

                      <p className="text-zinc-400 text-[11px] uppercase tracking-[0.22em]">
                        Units
                      </p>

                      <p className="text-[24px] font-semibold mt-2">
                        {
                          property.unit_count
                        }
                      </p>

                    </div>

                    <div>

                      <p className="text-zinc-400 text-[11px] uppercase tracking-[0.22em]">
                        Occupancy
                      </p>

                      <p className="text-[24px] font-semibold mt-2">
                        {
                          property.occupancy
                        }
                      </p>

                    </div>

                    <div>

                      <p className="text-zinc-400 text-[11px] uppercase tracking-[0.22em]">
                        Manager
                      </p>

                      <p className="text-[18px] font-medium mt-2">
                        {
                          property.manager
                        }
                      </p>

                    </div>

                    <div>

                      <p className="text-zinc-400 text-[11px] uppercase tracking-[0.22em]">
                        Maintenance History
                      </p>

                      <p className="text-[24px] font-semibold mt-2">
                        {
                          property.maintenance_history
                        }
                      </p>

                    </div>

                  </div>

                </div>

                <div className="h-[42px] px-5 rounded-full bg-black text-white flex items-center text-[12px]">
                  {
                    property.risk_score
                  }
                </div>

              </div>

            </div>

          )
        )}

      </div>

    </AppShell>
  );
}