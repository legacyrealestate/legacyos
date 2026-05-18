import { NextResponse } from "next/server";

export async function GET() {

  return NextResponse.json([
    {
      id: 1,
      category: "Maintenance",
      sender: "tenant@legacy.com",
      subject: "Water leak in kitchen",
      summary:
        "Tenant reported active leak under sink requiring urgent maintenance attention.",
      priority: "High",
    },

    {
      id: 2,
      category: "Leasing",
      sender: "lead@email.com",
      subject: "Interested in scheduling a tour",
      summary:
        "Potential renter interested in touring downtown property next week.",
      priority: "Medium",
    },

    {
      id: 3,
      category: "Investor",
      sender: "investor@email.com",
      subject: "Multifamily acquisition opportunity",
      summary:
        "Investor requesting information regarding acquisition opportunities.",
      priority: "Low",
    },
  ]);
}