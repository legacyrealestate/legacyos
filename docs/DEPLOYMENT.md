# Deployment

## Supabase

1. Review and run migrations in order:
   - `supabase/migrations/202607170001_pilot_hardening.sql`
2. Create the private `legacy-documents` bucket through the migration or dashboard.
3. Create the first Supabase Auth user manually.
4. In SQL, update that user's `profiles` row to `role = 'admin'` and `active = true`.

## Vercel Environment Variables

Set these names only with real values in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` if retained for admin-only AI tools
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `ELEVENLABS_WEBHOOK_SECRET`
- `ENABLE_OUTBOUND_COMMUNICATIONS`
- `NEXT_PUBLIC_APP_URL`

Keep `ENABLE_OUTBOUND_COMMUNICATIONS=false` for supervised pilot testing until SMS is explicitly approved.

## ElevenLabs

Configure the post-call transcription webhook:

```text
https://legacynashvilleos.space/api/elevenlabs
```

Use the dashboard webhook secret as `ELEVENLABS_WEBHOOK_SECRET`. The handler verifies HMAC signatures, rejects stale payloads, and uses conversation ID idempotency.

## Twilio

Twilio remains the carrier. Do not configure `/api/twilio/voice` as an inbound voice handler.

For SMS delivery status callbacks, configure:

```text
https://legacynashvilleos.space/api/twilio/status
```

The callback validates `X-Twilio-Signature`.

## Testing

1. Use a test Supabase project.
2. Keep outbound communications disabled.
3. Submit a staff-created maintenance ticket.
4. Send a signed ElevenLabs test webhook payload.
5. Review vendor recommendations and approve a vendor without sending real SMS.
6. Confirm documents are listed through signed URLs only.

## Rollback

1. Disable new webhook URLs in ElevenLabs and Twilio.
2. Set `ENABLE_OUTBOUND_COMMUNICATIONS=false`.
3. Revert the application deployment to the previous Vercel version.
4. Preserve Supabase data; do not drop pilot tables without an export.
