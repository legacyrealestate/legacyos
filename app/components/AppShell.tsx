"use client";

import Link from "next/link";

import { useState } from "react";

import {
  LayoutDashboard,
  Phone,
  Inbox,
  Wrench,
  Building2,
  Brain,
  Settings,
  Menu,
  X,
  ClipboardList,
  Mail,
  Users,
  Briefcase,
} from "lucide-react";

export default function AppShell({
  children,
}: any) {

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const links = [

    {
      label:
        "Dashboard",
      href: "/",
      icon:
        LayoutDashboard,
    },

    {
      label:
        "AI Calls",
      href: "/calls",
      icon:
        Phone,
    },

    {
      label:
        "AI Inbox",
      href: "/inbox",
      icon:
        Inbox,
    },

    {
      label:
        "Maintenance",
      href:
        "/maintenance",
      icon:
        Wrench,
    },

    {
      label:
        "Leasing",
      href:
        "/leasing",
      icon:
        Building2,
    },

    {
      label:
        "Operations",
      href:
        "/operations",
      icon:
        ClipboardList,
    },

    {
      label:
        "Email Ops",
      href:
        "/email",
      icon:
        Mail,
    },

    {
      label:
        "Contacts",
      href:
        "/contacts",
      icon:
        Users,
    },

    {
      label:
        "Vendors",
      href:
        "/vendors",
      icon:
        Briefcase,
    },

    {
      label:
        "Integrations",
      href:
        "/integrations",
      icon:
        Brain,
    },

    {
      label:
        "Properties",
      href:
        "/properties",
      icon:
        Building2,
    },

    {
      label:
        "Command",
      href:
        "/command",
      icon:
        Brain,
    },

    {
      label:
        "Settings",
      href:
        "/settings",
      icon:
        Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f3] flex">

      {/* MOBILE TOPBAR */}

      <div className="fixed top-0 left-0 right-0 h-[72px] bg-white border-b border-black/[0.06] z-[200] flex items-center justify-between px-5 md:hidden">

        <h1 className="text-[24px] font-semibold tracking-tight">
          LegacyOS
        </h1>

        <button
          onClick={() =>
            setMobileOpen(
              !mobileOpen
            )
          }
        >

          {mobileOpen
            ? <X />
            : <Menu />}

        </button>

      </div>

      {/* MOBILE SIDEBAR */}

      <div
        className={`fixed inset-y-0 left-0 w-[280px] bg-white border-r border-black/[0.06] z-[300] transform transition-all duration-300 ease-out md:hidden ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        <div className="p-6 pt-24 space-y-2">

          {links.map(
            (
              link,
              index
            ) => {

              const Icon =
                link.icon;

              return (
                <Link
                  key={index}
                  href={
                    link.href
                  }
                  className="h-[56px] px-5 rounded-[18px] flex items-center gap-4 hover:bg-black hover:text-white transition-all duration-300 ease-out"
                  onClick={() =>
                    setMobileOpen(
                      false
                    )
                  }
                >

                  <Icon
                    size={18}
                  />

                  <span className="text-[14px] font-medium">
                    {
                      link.label
                    }
                  </span>

                </Link>
              );
            }
          )}

        </div>

      </div>

      {/* DESKTOP SIDEBAR */}

      <div className="hidden md:flex w-[270px] border-r border-black/[0.06] bg-white flex-col p-6">

        <div>

          <p className="uppercase tracking-[0.3em] text-zinc-400 text-[10px]">
            Autonomous Infrastructure
          </p>

          <h1 className="text-[34px] font-semibold tracking-tight mt-4">
            LegacyOS
          </h1>

        </div>

        <div className="space-y-2 mt-12 overflow-y-auto">

          {links.map(
            (
              link,
              index
            ) => {

              const Icon =
                link.icon;

              return (
                <Link
                  key={index}
                  href={
                    link.href
                  }
                  className="h-[58px] px-5 rounded-[18px] flex items-center gap-4 hover:bg-black hover:text-white transition-all duration-300 ease-out"
                >

                  <Icon
                    size={18}
                  />

                  <span className="text-[14px] font-medium">
                    {
                      link.label
                    }
                  </span>

                </Link>
              );
            }
          )}

        </div>

      </div>

      {/* CONTENT */}

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-[90px] md:pt-8">

        {children}

      </div>

    </div>
  );
}