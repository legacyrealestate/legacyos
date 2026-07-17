export const runtime = "nodejs";

import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireAdmin, requireUser } from "@/lib/security/auth";
import {
  assertE164,
  assertOneOf,
  assertOptionalString,
  assertString,
  assertUuid,
  safeJsonObject,
} from "@/lib/security/validation";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const VENDOR_PRIORITIES = ["Standard", "Preferred", "Emergency", "Backup"] as const;

function assertEmail(value: unknown) {
  const email = assertOptionalString(value, "email", 180);
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError("bad_request", "Invalid email.");
  }
  return email;
}

export async function GET() {
  try {
    await requireUser();
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("trade", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return apiJson(data || []);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    const supabase = createServiceSupabaseClient();
    const body = safeJsonObject(await req.json());

    const { data, error } = await supabase
      .from("vendors")
      .insert({
        name: assertString(body.name, "name", 160),
        trade: assertOptionalString(body.trade, "trade", 80) || "General",
        phone: body.phone ? assertE164(body.phone, "phone") : null,
        email: assertEmail(body.email),
        dispatch_keywords: Array.isArray(body.dispatch_keywords)
          ? body.dispatch_keywords.map((keyword) => assertString(keyword, "keyword", 60))
          : [],
        priority: assertOneOf(body.priority || "Standard", VENDOR_PRIORITIES, "priority"),
        emergency_available: body.emergency_available === true,
        active: body.active !== false,
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return apiJson(data);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin();
    const supabase = createServiceSupabaseClient();
    const body = safeJsonObject(await req.json());
    const vendorId = assertUuid(body.vendorId);

    const updates: Record<string, unknown> = {
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updates.name = assertString(body.name, "name", 160);
    if (body.trade !== undefined) updates.trade = assertOptionalString(body.trade, "trade", 80) || "General";
    if (body.phone !== undefined) {
      const phone = assertOptionalString(body.phone, "phone", 30);
      updates.phone = phone ? assertE164(phone, "phone") : null;
    }
    if (body.email !== undefined) updates.email = assertEmail(body.email);
    if (body.priority !== undefined) updates.priority = assertOneOf(body.priority || "Standard", VENDOR_PRIORITIES, "priority");
    if (body.emergency_available !== undefined) updates.emergency_available = body.emergency_available === true;
    if (body.active !== undefined) updates.active = body.active === true;
    if (body.dispatch_keywords !== undefined) {
      updates.dispatch_keywords = Array.isArray(body.dispatch_keywords)
        ? body.dispatch_keywords.map((keyword) => assertString(keyword, "keyword", 60))
        : [];
    }

    const { data, error } = await supabase
      .from("vendors")
      .update(updates)
      .eq("id", vendorId)
      .select()
      .single();

    if (error) throw error;
    return apiJson(data);
  } catch (error) {
    return apiError(error);
  }
}
