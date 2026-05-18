import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

const supabase =
  createClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL!,
    process.env
      .SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

    const { data: user } =
      await supabase
        .from("users")
        .select("*")
        .eq(
          "email",
          body.email
        )
        .eq(
          "password",
          body.password
        )
        .single();

    if (!user) {

      return NextResponse.json(
        {
          error:
            "Invalid credentials",
        },
        {
          status: 401,
        }
      );

    }

    return NextResponse.json({
      success: true,
      user,
    });

  } catch (error) {

    return NextResponse.json(
      {
        error:
          "Login failed",
      },
      {
        status: 500,
      }
    );

  }
}