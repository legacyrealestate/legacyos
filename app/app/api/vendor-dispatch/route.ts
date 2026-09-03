export const runtime = "nodejs";

import { ApiError, apiError, apiJson } from "@/lib/security/api";
import { requireUser } from "@/lib/security/auth";
import { assertE164, assertUuid, safeJsonObject } from "@/lib/security/validation";
import { sendSMS } from "@/lib/communications/sms";
import { getTwilioStatusCallbackUrl } from "@/lib/communications/twilio";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { sendClaimedVendorNotification } from "@/lib/workflows/vendor-notification";
import {
  ACTIVE_VENDOR_JOB_STATUSES,
  canChangeVendorBeforeExternalAttempt,
  createDispatchKey,
  shouldBlockExternalRetry,
} from "@/lib/workflows/dispatch-state";
import { rankVendors, type VendorRecord } from "@/lib/workflows/vendors";

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    const body = safeJsonObject(await req.json());
    const ticketId = assertUuid(body.ticketId, "ticketId");
    const vendorId = typeof body.vendorId === "string" ? assertUuid(body.vendorId, "vendorId") : null;
    const approve = body.approve === true;
    const supabase = createServiceSupabaseClient();

    const { data: ticket, error: ticketError } = await supabase
      .from("maintenance_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError) throw new ApiError("not_found", "Ticket not found.");

    const { data: candidateDispatches, error: dispatchError } = await supabase
      .from("vendor_jobs")
      .select("id, vendor_id, status, notification_status, provider_message_sid, notification_attempt_key, closed_at")
      .eq("ticket_id", ticketId)
      .is("closed_at", null);

    if (dispatchError) throw new ApiError("server_error", dispatchError.message);
    const activeDispatches = (candidateDispatches || []).filter(
      (dispatch) =>
        dispatch.status === "Recommended" ||
        ACTIVE_VENDOR_JOB_STATUSES.includes(dispatch.status as (typeof ACTIVE_VENDOR_JOB_STATUSES)[number]) ||
        Boolean(dispatch.notification_attempt_key) ||
        Boolean(dispatch.provider_message_sid) ||
        dispatch.notification_status === "Sending"
    );
    if (activeDispatches.length > 1) {
      throw new ApiError("conflict", "Multiple active vendor jobs require reconciliation.");
    }
    const activeDispatch = activeDispatches[0] || null;
    if (activeDispatch && approve && shouldBlockExternalRetry(activeDispatch)) {
      return apiJson({
        success: true,
        idempotent: true,
        status: activeDispatch.status,
        notificationStatus: activeDispatch.notification_status,
        jobId: activeDispatch.id,
      });
    }

    const { data: vendors, error: vendorsError } = await supabase
      .from("vendors")
      .select("id,name,trade,coverage_trades,phone,email,alternate_email,dispatch_keywords,priority,emergency_available,active,dispatch_order,open_jobs,total_dispatched,last_dispatched_at")
      .eq("active", true);

    if (vendorsError) throw new ApiError("server_error", vendorsError.message);

    const issueText = `${ticket.issue || ""} ${ticket.ai_summary || ""} ${ticket.issue_category || ""} ${ticket.urgency || ""}`;
    const ranked = rankVendors((vendors || []) as VendorRecord[], issueText);

    if (!approve) {
      const { error: updateError } = await supabase
        .from("maintenance_tickets")
        .update({
          status: "Vendor Recommended",
          dispatch_status: "Recommended",
          updated_by: auth.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (updateError) throw new ApiError("server_error", updateError.message);
      return apiJson({ success: true, status: "Recommended", recommendations: ranked.slice(0, 5) });
    }

    if (!vendorId) throw new ApiError("bad_request", "Select a vendor before approval.");
    const selectedVendor = ranked.find((vendor) => vendor.id === vendorId);
    if (!selectedVendor) throw new ApiError("bad_request", "Selected vendor is not active or available.");

    let job = activeDispatch || null;

    if (!job) {
      const { data: insertedJob, error: jobError } = await supabase
        .from("vendor_jobs")
        .insert({
          ticket_id: ticketId,
          vendor_id: selectedVendor.id,
          vendor_name: selectedVendor.name,
          issue: ticket.issue,
          tenant_name: ticket.tenant_name,
          urgency: ticket.urgency,
          status: "Approved",
          notification_status: "Approved",
          approved_by: auth.user.id,
        })
        .select("id, vendor_id, status, notification_status, provider_message_sid, notification_attempt_key, closed_at")
        .single();

      if (jobError) throw new ApiError("server_error", jobError.message);
      job = insertedJob;
    } else if (job.vendor_id !== selectedVendor.id) {
      if (!canChangeVendorBeforeExternalAttempt(job)) {
        throw new ApiError("conflict", "Vendor cannot be changed after external notification has started.");
      }

      const { data: updatedJob, error: updateJobError } = await supabase
        .from("vendor_jobs")
        .update({
          vendor_id: selectedVendor.id,
          vendor_name: selectedVendor.name,
          issue: ticket.issue,
          tenant_name: ticket.tenant_name,
          urgency: ticket.urgency,
          status: "Approved",
          notification_status: "Approved",
          approved_by: auth.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .select("id, vendor_id, status, notification_status, provider_message_sid, notification_attempt_key, closed_at")
        .single();

      if (updateJobError) throw new ApiError("server_error", updateJobError.message);
      job = updatedJob;
    }

    const updates = await Promise.all([
      supabase
        .from("maintenance_tickets")
        .update({
          assigned_vendor_id: selectedVendor.id,
          assigned_vendor_name: selectedVendor.name,
          assigned_to_name: selectedVendor.name,
          assigned_to_phone: selectedVendor.phone,
          assigned_to_email: selectedVendor.email,
          dispatch_status: "Approved",
          status: "Vendor Approved",
          updated_by: auth.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId),
      supabase.from("ticket_updates").insert({
        ticket_id: ticketId,
        type: "vendor_dispatch",
        title: "Vendor Approved",
        description: `${selectedVendor.name} was approved for notification. No vendor is labeled dispatched until contact succeeds or is manually recorded.`,
        created_by: auth.user.id,
        vendor_job_id: job.id,
      }),
      supabase.from("operations_feed").insert({
        type: "vendor_approval",
        title: `Vendor approved: ${selectedVendor.name}`,
        description: `${selectedVendor.name} approved for ${ticket.issue}. Notification is pending.`,
        related_ticket_id: ticketId,
        created_by: auth.user.id,
      }),
    ]);

    const failed = updates.find((result) => result.error);
    if (failed?.error) throw new ApiError("server_error", failed.error.message);

    const vendorMessage = `Legacy Real Estate Group approved maintenance work order. Issue: ${ticket.issue || "Maintenance issue"}. Property: ${ticket.property || "Property on file"}${ticket.unit ? `, unit ${ticket.unit}` : ""}. Contact Legacy staff using the approved vendor process to confirm availability. Do not reply to this automated message.`;
    const callbackUrl = getTwilioStatusCallbackUrl();

    if (process.env.ENABLE_OUTBOUND_COMMUNICATIONS !== "true") {
      const disabledUpdates = await Promise.all([
        supabase
          .from("vendor_jobs")
          .update({
            status: "Approved",
            notification_status: "Disabled",
            provider_status: "disabled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id),
        supabase
          .from("maintenance_tickets")
          .update({
            dispatch_status: "Notification Disabled",
            status: "Vendor Approved",
            updated_by: auth.user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticketId),
        supabase.from("ticket_updates").upsert(
          {
            ticket_id: ticketId,
            type: "vendor_notification_preview",
            title: "Vendor Notification Preview",
            description: "Outbound communications are disabled; no SMS was sent.",
            provider_status: "disabled",
            created_by: auth.user.id,
            vendor_job_id: job.id,
          },
          { onConflict: "vendor_job_id,type" }
        ),
      ]);

      const disabledFailed = disabledUpdates.find((result) => result.error);
      if (disabledFailed?.error) throw new ApiError("server_error", disabledFailed.error.message);

      return apiJson({
        success: true,
        status: "Approved",
        notificationStatus: "Disabled",
        preview: {
          to: selectedVendor.phone,
          body: vendorMessage,
        },
        vendor: selectedVendor,
        jobId: job.id,
      });
    }

    if (!callbackUrl) throw new ApiError("server_error", "NEXT_PUBLIC_APP_URL is required for Twilio status callbacks.");
    const vendorPhone = assertE164(selectedVendor.phone, "vendor phone");
    const notificationAttemptKey = createDispatchKey();
    const result = await sendClaimedVendorNotification({
      attemptKey: notificationAttemptKey,
      to: vendorPhone,
      body: vendorMessage,
      callbackUrl,
      send: sendSMS,
      store: {
        async claimAttempt(attemptKey) {
          const { data, error } = await supabase.rpc("claim_vendor_notification_attempt", {
            job_id_input: job.id,
            attempt_key_input: attemptKey,
            actor_id_input: auth.user.id,
          });
          if (error) throw new ApiError("server_error", error.message);
          return data === true;
        },
        async persistMessageSid(messageSid, providerStatus) {
          const { data, error } = await supabase.rpc("persist_vendor_message_sid", {
            job_id_input: job.id,
            attempt_key_input: notificationAttemptKey,
            message_sid_input: messageSid,
            provider_status_input: providerStatus,
          });
          if (error) return false;
          return data === true;
        },
        async markReconciliationRequired() {
          const { error } = await supabase.rpc("mark_vendor_job_reconciliation_required", {
            job_id_input: job.id,
            attempt_key_input: notificationAttemptKey,
          });
          if (error) throw new ApiError("server_error", error.message);
        },
        async writeSecondarySuccess(messageSid, providerStatus) {
          const sentUpdates = await Promise.all([
            supabase
              .from("maintenance_tickets")
              .update({
                dispatch_status: "Notification Queued",
                status: "Notification Queued",
                updated_by: auth.user.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", ticketId),
            supabase.rpc("increment_vendor_notification_counter", {
              job_id_input: job.id,
              actor_id_input: auth.user.id,
            }),
            supabase.from("ticket_updates").upsert(
              {
                ticket_id: ticketId,
                type: "vendor_notification_sent",
                title: "Vendor Notification Queued",
                description: `${selectedVendor.name} notification was accepted for delivery tracking.`,
                provider_message_sid: messageSid,
                provider_status: providerStatus,
                created_by: auth.user.id,
                vendor_job_id: job.id,
              },
              { onConflict: "vendor_job_id,type" }
            ),
          ]);

          const sentFailed = sentUpdates.find((update) => update.error);
          if (sentFailed?.error) throw new ApiError("server_error", sentFailed.error.message);
        },
      },
    });

    if (!result.claimed) {
      return apiJson({ success: true, idempotent: true, status: "Notification Queued", jobId: job.id });
    }

    if (result.status === "Reconciliation Required") {
      return apiJson(
        {
          success: false,
          status: "Reconciliation Required",
          error: "Vendor notification requires reconciliation before retry.",
          jobId: job.id,
          messageSid: result.messageSid,
        },
        { status: 503 }
      );
    }

    if (result.status === "Reconciliation Persistence Failed") {
      return apiJson(
        {
          success: false,
          status: "Reconciliation Required",
          error: "Vendor notification outcome is uncertain. Reconciliation persistence failed; automatic retry remains blocked by the durable attempt.",
          jobId: job.id,
        },
        { status: 503 }
      );
    }

    return apiJson({
      success: true,
      status: result.status,
      notificationStatus: result.notificationStatus,
      vendor: selectedVendor,
      jobId: job.id,
      messageSid: result.messageSid,
    });
  } catch (error) {
    return apiError(error);
  }
}
