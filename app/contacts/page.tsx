"use client";

import AppShell from "@/app/components/AppShell";

const contacts = [

  {
    name:
      "Leasing Manager",
    role:
      "Leasing",
    phone:
      "(615) 555-2121",
  },

  {
    name:
      "Maintenance Supervisor",
    role:
      "Maintenance",
    phone:
      "(615) 555-8821",
  },

  {
    name:
      "Investor Relations",
    role:
      "Investments",
    phone:
      "(615) 555-9132",
  },

];

export default function ContactsPage() {

  return (
    <AppShell>

      <div className="rounded-[40px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.25em] text-zinc-400 text-[10px]">
          Human Escalation Infrastructure
        </p>

        <h1 className="text-[58px] font-semibold tracking-tight mt-5">
          Operations Contacts
        </h1>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

        {contacts.map(
          (
            contact,
            index
          ) => (

            <div
              key={index}
              className="rounded-[34px] border border-black/[0.06] bg-white p-8"
            >

              <p className="uppercase tracking-[0.22em] text-zinc-400 text-[10px]">
                {contact.role}
              </p>

              <h2 className="text-[28px] font-semibold mt-5">
                {contact.name}
              </h2>

              <p className="text-zinc-500 text-[14px] mt-3">
                {contact.phone}
              </p>

              <button className="h-[54px] px-6 rounded-2xl bg-black text-white text-[14px] mt-8">
                Escalate Call
              </button>

            </div>

          )
        )}

      </div>

    </AppShell>
  );
}