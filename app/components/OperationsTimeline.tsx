"use client";

export default function OperationsTimeline({
  operations,
}: any) {

  return (
    <div className="space-y-6">

      {operations?.map(
        (
          operation: any,
          index: number
        ) => (

          <div
            key={index}
            className="flex gap-5"
          >

            <div className="flex flex-col items-center">

              <div className="h-[14px] w-[14px] rounded-full bg-black animate-pulse" />

              <div className="w-[1px] flex-1 bg-black/[0.08]" />

            </div>

            <div className="pb-10 w-full">

              <div className="rounded-[30px] border border-black/[0.06] bg-white p-6 hover:scale-[1.01] transition-all duration-300 ease-out">

                <div className="flex items-center justify-between gap-5">

                  <h3 className="text-[15px] font-medium">
                    {
                      operation.title
                    }
                  </h3>

                  <div className="h-[30px] px-3 rounded-full bg-black text-white text-[10px] flex items-center">
                    {
                      operation.type
                    }
                  </div>

                </div>

                <p className="text-zinc-500 text-[13px] leading-relaxed mt-4">
                  {
                    operation.description
                  }
                </p>

                <p className="text-zinc-400 text-[11px] mt-5">
                  {
                    new Date(
                      operation.created_at
                    ).toLocaleTimeString()
                  }
                </p>

              </div>

            </div>

          </div>

        )
      )}

    </div>
  );
}