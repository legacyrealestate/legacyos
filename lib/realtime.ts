import { getSupabaseBrowserClient } from "@/lib/supabase";

export function getRealtimeClient() {
  return getSupabaseBrowserClient();
}
