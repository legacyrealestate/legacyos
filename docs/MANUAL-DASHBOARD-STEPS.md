# Manual Dashboard Steps

## Supabase

1. Review `supabase/migrations/202607170001_pilot_hardening.sql`.
2. Run the read-only checks in `docs/SUPABASE-PREFLIGHT.sql`; every query should return zero rows.
3. Run the migration once in the Supabase SQL editor.
4. Confirm privileged RPCs are executable only by `service_role`.
5. Create the first Supabase Auth user manually.
6. In a separate SQL editor run, execute this bootstrap block with the real Auth user UUID:

```sql
insert into profiles (id, full_name, role, active)
values ('REPLACE_WITH_AUTH_USER_UUID', 'First Admin', 'admin', true)
on conflict (id) do update
set role = 'admin',
    active = true,
    updated_at = now();
```

7. Confirm RLS is enabled on `profiles`, `maintenance_tickets`, `vendors`, `vendor_jobs`, `ticket_updates`, `operations_feed`, `notifications`, `client_requests`, and `command_memory`.
8. Confirm staff direct-write policies are absent on operational tables; staff mutations must go through protected API routes.
9. Confirm the `legacy-documents` storage bucket is private.
10. Confirm public signups are not automatically marked active staff.

## Vercel

1. Add all variables from `.env.example`.
2. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS production origin.
3. Set `ENABLE_OUTBOUND_COMMUNICATIONS=false` for pilot dry runs.
4. Deploy only after local lint, test, TypeScript, and build checks pass.

## ElevenLabs

1. Add post-call webhook URL: `https://legacynashvilleos.space/api/elevenlabs`.
2. Copy the webhook secret into `ELEVENLABS_WEBHOOK_SECRET`.
3. Optionally set `ELEVENLABS_AGENT_ID` to the exact permitted agent ID.
4. Enable retries for the `post_call_transcription` webhook in ElevenLabs.
5. Send a `post_call_transcription` test event and verify one ticket plus intake activity is created.
6. Re-send the same conversation ID and verify it is idempotent.
7. Confirm webhook processing still returns success after durable intake creation.

## Twilio

1. Keep inbound voice pointed to ElevenLabs, not LegacyOS.
2. Confirm the canonical status callback URL is `NEXT_PUBLIC_APP_URL` plus `/api/twilio/status`.
3. Do not accept callback URLs from the browser or staff UI.
4. Do not set `ENABLE_OUTBOUND_COMMUNICATIONS=true` until the authorized owner approves.
5. Verify callbacks are signed with `X-Twilio-Signature` before enabling live SMS.
