"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const login = async () => {

    try {

      setLoading(true);

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {

        alert(error.message);

        setLoading(false);

        return;

      }

      window.location.href = "/";

    } catch (err) {

      console.error(err);

      alert(
        "Authentication failed"
      );

    }

    setLoading(false);

  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">

      <div className="w-full max-w-[520px] rounded-[40px] border border-black/[0.06] bg-white p-10 shadow-[0_20px_80px_rgba(0,0,0,0.06)]">

        <p className="uppercase tracking-[0.28em] text-zinc-400 text-[11px]">
          Secure Infrastructure Access
        </p>

        <h1 className="text-[52px] font-semibold tracking-tight mt-5">
          LegacyOS
        </h1>

        <p className="text-zinc-500 text-[15px] leading-relaxed mt-5">
          Enterprise operational intelligence platform.
        </p>

        <div className="mt-10">

          <p className="text-[13px] text-zinc-500 mb-3">
            Email Address
          </p>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="you@company.com"
            className="w-full h-[58px] rounded-2xl border border-black/[0.06] px-5 outline-none bg-white"
          />

        </div>

        <div className="mt-6">

          <p className="text-[13px] text-zinc-500 mb-3">
            Password
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="••••••••"
            className="w-full h-[58px] rounded-2xl border border-black/[0.06] px-5 outline-none bg-white"
          />

        </div>

        <button
          onClick={login}
          disabled={loading}
          className="w-full h-[58px] rounded-2xl bg-black text-white mt-8 text-[14px] font-medium transition-all duration-300 hover:opacity-90 disabled:opacity-50"
        >
          {
            loading
              ? "Accessing Infrastructure..."
              : "Access Infrastructure"
          }
        </button>

        <div className="mt-8 text-center">

          <p className="text-[12px] text-zinc-400">
            Authorized enterprise access only.
          </p>

        </div>

      </div>

    </div>
  );
}
