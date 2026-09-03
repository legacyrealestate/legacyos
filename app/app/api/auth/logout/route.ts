import { cookies } from "next/headers";
import { apiError, apiJson } from "@/lib/security/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" });
    const store = await cookies();
    for (const cookie of store.getAll()) {
      if (/^(?:sb-|supabase|legacyos-auth)/i.test(cookie.name)) store.set(cookie.name, "", { path: "/", maxAge: 0, expires: new Date(0), httpOnly: true, sameSite: "lax" });
    }
    return apiJson({ success: true }, { headers: { "Clear-Site-Data": '"cache", "storage"' } });
  } catch (error) { return apiError(error); }
}
