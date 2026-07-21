import { apiError, ApiError } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { elevenLabsAudio } from "@/lib/providers/elevenlabs";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(); const { id } = await context.params;
    const db = createServiceSupabaseClient();
    const { data, error } = await db.from("maintenance_tickets").select("provider,provider_conversation_id,recording_available").eq("id", id).single();
    if (error || !data) throw new ApiError("not_found", "Call was not found.");
    if (data.provider !== "elevenlabs" || !data.provider_conversation_id || !data.recording_available) throw new ApiError("not_found", "Recording is unavailable.");
    const audio = await elevenLabsAudio(data.provider_conversation_id);
    return new Response(audio.body, { headers: { "Content-Type": audio.headers.get("content-type") || "audio/mpeg", "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
