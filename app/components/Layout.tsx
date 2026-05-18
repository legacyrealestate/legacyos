import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileSidebar from "./MobileSidebar";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen overflow-hidden bg-[#FAFAFA] text-zinc-800">

      {/* DESKTOP SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <section className="flex flex-1 flex-col overflow-hidden">

        <Topbar />

        <div className="flex-1 overflow-y-auto p-4 pb-28 lg:p-8">
          {children}
        </div>
      </section>

      {/* MOBILE NAV */}
      <MobileSidebar />
    </main>
  );
}