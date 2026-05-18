"use client";

export default function NotificationDrawer({
  open,
  onClose,
  notifications,
}: any) {

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[420px] bg-white border-l border-black/[0.06] z-[100] transition-all duration-300 ease-out ${
        open
          ? "translate-x-0"
          : "translate-x-full"
      }`}
    >

      <div className="p-8">

        <div className="flex items-center justify-between">

          <div>

            <p className="uppercase tracking-[0.25em] text-zinc-400 text-[10px]">
              Live Infrastructure
            </p>

            <h2 className="text-[36px] font-semibold tracking-tight mt-4">
              Notifications
            </h2>

          </div>

          <button
            onClick={onClose}
            className="h-[42px] w-[42px] rounded-full border border-black/[0.06]"
          >
            ✕
          </button>

        </div>

        <div className="space-y-4 mt-8">

          {notifications?.map(
            (
              notification: any,
              index: number
            ) => (

              <div
                key={index}
                className="rounded-[28px] border border-black/[0.06] bg-[#fafafa] p-6 hover:scale-[1.02] transition-all duration-300 ease-out"
              >

                <div className="flex items-center justify-between gap-4">

                  <h3 className="text-[15px] font-medium">
                    {
                      notification.title
                    }
                  </h3>

                  <div className="h-[28px] px-3 rounded-full bg-black text-white text-[10px] flex items-center">
                    LIVE
                  </div>

                </div>

                <p className="text-zinc-500 text-[13px] leading-relaxed mt-4">
                  {
                    notification.description
                  }
                </p>

              </div>

            )
          )}

        </div>

      </div>

    </div>
  );
}