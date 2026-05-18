import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  const params =
    await context.params;

  return NextResponse.json({

    success: true,

    ticketId:
      params.id,

  });

}

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  const params =
    await context.params;

  const body =
    await req.json();

  return NextResponse.json({

    success: true,

    ticketId:
      params.id,

    updated:
      body,

  });

}