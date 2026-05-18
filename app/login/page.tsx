"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import {
  createClient,
} from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

export default function LoginPage() {

  const router =
    useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const login = async () => {

    try {

      setLoading(true);

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {

        alert(error.message);

        setLoading(false);

        return;

      }

      localStorage.setItem(
        "legacy-user",
        JSON.stringify(
          data.user
        )
      );

      router.push("/");

    } catch (error) {

      console.error(error);

      alert(
        "Login failed"
      );

    }

    setLoading(false);

  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-10">

      <div className="w-full max-w-[520px] rounded-[40px] border border-black/[0.06] bg-white p-10">

        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Secure Infrastructure Access
        </p>

        <h1 className="text-[52px] font-semibold tracking-tight mt-5">
          LegacyOS
        </h1>

        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5">
          Enterprise operational intelligence system.
        </p>

        {/* EMAIL */}

        <div className="mt-10">

          <p className="text-[13px] text-zinc-500 mb-3">
            Email
          </p>

          <input
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            className="w-full h-[58px] rounded-2xl border border-black/[0.06] px-5 outline-none"
          />

        </div>

        {/* PASSWORD */}

        <div className="mt-6">

          <p className="text-[13px] text-zinc-500 mb-3">
            Password
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="w-full h-[58px] rounded-2xl border border-black/[0.06] px-5 outline-none"
          />

        </div>

        {/* BUTTON */}

        <button
          onClick={login}
          disabled={loading}
          className="w-full h-[58px] rounded-2xl bg-black text-white mt-8 text-[14px] font-medium disabled:opacity-50"
        >
          {loading
            ? "Accessing..."
            : "Access Infrastructure"}
        </button>

        {/* ACCOUNTS */}

        <div className="rounded-[24px] border border-black/[0.06] bg-[#fafafa] p-5 mt-8">

          <p className="text-[13px] font-medium">
            Enterprise Accounts
          </p>

          <div className="space-y-2 mt-4 text-[12px] text-zinc-500">

            <p>
              admin@legacyos.com / legacy123
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}
