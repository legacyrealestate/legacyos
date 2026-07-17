import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRelativeRedirect } from "@/lib/security/redirects";

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRelativeRedirect(requestUrl.searchParams.get("next"));

  if (!next) {
    return NextResponse.redirect(new URL("/login?error=invalid_redirect", requestUrl.origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?error=auth_callback", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
