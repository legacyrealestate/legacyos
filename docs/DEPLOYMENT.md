# Deployment

## Supabase

1. Review and run migrations in order:
   - `supabase/migrations/202607170001_pilot_hardening.sql`
   - `supabase/migrations/202607200001_autonomous_operations.sql`
   - `supabase/migrations/202607200002_operational_platform.sql`
   - `supabase/migrations/202607210001_launch_communications_compat.sql`
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
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `LEGACY_ADMIN_EMAILS`
- `LEGACY_STAFF_EMAILS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `APP_ENCRYPTION_KEY`
- `CRON_SECRET`
- `ENABLE_OUTBOUND_COMMUNICATIONS`
- `NEXT_PUBLIC_APP_URL`

Keep `ENABLE_OUTBOUND_COMMUNICATIONS=false` for supervised pilot testing until SMS is explicitly approved.

## ElevenLabs

Configure the post-call transcription webhook:

```text
https://legacynashvilleos.space/api/elevenlabs
```

Use the dashboard webhook secret as `ELEVENLABS_WEBHOOK_SECRET`. The handler verifies HMAC signatures, rejects stale payloads, and uses conversation ID idempotency.

Historical/cron sync: `GET /api/elevenlabs/sync` with `Authorization: Bearer <CRON_SECRET>`.
Recording delivery is proxied through authenticated route `/api/calls/{ticket-id}/audio`.

## Email OAuth

Register these exact web redirect URLs (replace the example origin with `NEXT_PUBLIC_APP_URL`):

```text
https://legacynashvilleos.space/api/oauth/google/callback
https://legacynashvilleos.space/api/oauth/microsoft/callback
```

Enable the Gmail API for the Google project. In Microsoft Entra, add delegated `User.Read`, `Mail.Read`, and `Mail.Send` permissions. OAuth refresh/access tokens are encrypted at rest with `APP_ENCRYPTION_KEY`; generate it with `openssl rand -base64 32`.

## Scheduled operations

Configure the deployment scheduler to call these routes with `Authorization: Bearer <CRON_SECRET>`:

```text
GET /api/elevenlabs/sync   every 5 minutes
GET /api/cron/email       every 5 minutes
GET /api/cron/alma        every minute
```

Vercel Cron sends requests to production routes; add the paths and schedules to the project cron configuration, and configure the same `CRON_SECRET` in the deployment environment. Do not put the secret in the URL. Email sync resumes from Gmail history IDs and Microsoft Graph delta links. ALMA jobs use retry/backoff and move to `dead_letter` after their configured maximum attempts.

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

## Twilio Voice CRM

Configure these exact HTTPS webhook URLs. Every request is validated against its exact canonical URL derived from `NEXT_PUBLIC_APP_URL`:

```text
POST https://legacynashvilleos.space/api/twilio/voice/inbound
POST https://legacynashvilleos.space/api/twilio/voice/outbound
POST https://legacynashvilleos.space/api/twilio/voice/call-status
POST https://legacynashvilleos.space/api/twilio/voice/recording
POST https://legacynashvilleos.space/api/twilio/voice/transcription
```

Configure call progress events (`initiated`, `ringing`, `answered`, and `completed`) on the call-status URL. Configure recording status and transcription callbacks on their corresponding URLs. Use inbound/outbound URLs only when LegacyOS should own the initial TwiML response. Recording media is delivered through authenticated LegacyOS routes; permanent provider media URLs are not stored.

## OAuth scopes and smoke tests

Gmail requires `openid`, `email`, `gmail.readonly`, `gmail.modify`, and `gmail.send`. Microsoft requires delegated `openid`, `email`, `offline_access`, `User.Read`, `Mail.Read`, and `Mail.Send`; grant tenant admin consent only where required.

An active administrator can use **Test** on Integrations. Tests perform safe reads only: Gmail profile, Microsoft `/me`, ElevenLabs agent, and Twilio account. Configuration alone remains `never tested` and is never reported as authenticated.

## Production verification checklist

1. Apply migrations to staging in the documented order.
2. Confirm OAuth redirects exactly match `NEXT_PUBLIC_APP_URL`.
3. Authorize Gmail and Microsoft, then run protected smoke tests.
4. Send signed callbacks to every Twilio voice URL and confirm one CallSid yields one Phone CRM record.
5. Verify failed/no-answer calls create CRM and ALMA follow-up jobs.
6. Verify emergency transcript text creates an unacknowledged alert and escalation without claiming dispatch.
7. Run ElevenLabs sync and confirm exact CallSid reconciliation when supplied.
8. Exercise email drafts and approval with non-production recipients before enabling `email_send` autonomy.
9. Confirm cron timestamps advance for ElevenLabs, email, and ALMA.

Optional `EMAIL_ATTACHMENT_MAX_BYTES` defaults to 10485760 and is hard-capped at 25 MiB.

## Rollback steps

1. Disable new webhook URLs in ElevenLabs and Twilio.
2. Set `ENABLE_OUTBOUND_COMMUNICATIONS=false`.
3. Revert the application deployment to the previous Vercel version.
4. Preserve Supabase data; do not drop pilot tables without an export.
