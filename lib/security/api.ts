import { NextResponse } from "next/server";
export { ApiError } from "./errors.ts";
import { ApiError } from "./errors.ts";

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  console.error("API ERROR:", error);
  return NextResponse.json(
    { success: false, error: "Unexpected server error", code: "server_error" },
    {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export function apiJson<T>(data: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(data, {
    ...init,
    headers,
  });
}
