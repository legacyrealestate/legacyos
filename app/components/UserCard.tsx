"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function UserCard() {
  const [email, setEmail] =
    useState("");

  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      setEmail(user.email);
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    window.location.href = "/login";
  }

  useEffect(() => {
    getUser();
  }, []);

  return (
    <div className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">

      <div className="border-b border-zinc-200 px-6 py-5">

        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Active Session
        </h2>
      </div>

      <div className="space-y-5 p-6">

        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">

          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400">
            Logged In As
          </p>

          <h3 className="mt-4 text-lg font-medium text-zinc-900 break-all">
            {email || "Loading..."}
          </h3>
        </div>

        <button
          onClick={logout}
          className="w-full rounded-2xl bg-zinc-900 px-5 py-4 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          Logout
        </button>
      </div>
    </div>
  );
}