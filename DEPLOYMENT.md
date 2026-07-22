# LegacyOS launch deployment

## Migration order

Apply migrations in filename order, using the Supabase migration runner. Do not skip the compatibility migration:

1. `202607170001_pilot_hardening.sql`
2. `202607200001_autonomous_operations.sql`
3. `202607200002_operational_platform.sql`
4. `202607210001_launch_communications_compat.sql`

The compatibility migration is forward-only and reconciles the shared call/email tables created by the two July 20 migrations. Back up production before applying migrations. This repository does not apply them automatically.

## ElevenLabs Phone CRM

ElevenLabs is the canonical launch voice provider; Twilio credentials are not required. Configure the ElevenLabs ConvAI webhook for transcription, audio availability, and initiation-failure events at:

`https://YOUR_DOMAIN/api/elevenlabs`

Set `ELEVENLABS_API_KEY`, `ELEVENLABS_WEBHOOK_SECRET`, `ELEVENLABS_AGENT_ID`, and `NEXT_PUBLIC_APP_URL`. Schedule `GET /api/elevenlabs/sync` with `Authorization: Bearer $CRON_SECRET`; a 5-minute interval provides routine catch-up. Staff administrators can also run the protected sync button. Audio is delivered only through the authenticated LegacyOS proxy and provider credentials never reach the browser.

## Gmail and Microsoft 365

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `APP_ENCRYPTION_KEY`, and `NEXT_PUBLIC_APP_URL`. `APP_ENCRYPTION_KEY` must be a base64-encoded 32-byte value.

Gmail requires `openid email profile`, `gmail.readonly`, `gmail.modify`, `gmail.compose`, and `gmail.send`. Microsoft requires `openid email offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send`.

Register these exact redirects:

- `https://YOUR_DOMAIN/api/oauth/google/callback`
- `https://YOUR_DOMAIN/api/oauth/microsoft/callback`

Schedule `GET /api/cron/email` with `Authorization: Bearer $CRON_SECRET`; five minutes is the recommended launch interval. Provider OAuth tokens are encrypted at rest, refreshed server-side, and never returned to clients.

## Production verification

1. Confirm only the two approved employee emails are active in `profiles`; keep all other profiles inactive.
2. Run all four migrations in order and inspect the migration runner result.
3. Sign in as each employee and verify the same shared Gmail/Microsoft threads are visible.
4. Use Integrations smoke tests; distinguish configured from authenticated and confirm no secret appears in logs or responses.
5. Send a signed ElevenLabs test conversation, then verify transcript turns, classification, follow-up state, and authenticated audio playback.
6. Run historical ElevenLabs sync twice; the second run must use the stored checkpoint without creating duplicate calls.
7. Exercise Gmail and Microsoft draft, reply, reply-all, forward, approval, and send against dedicated test messages.
8. Verify revoked OAuth consent produces a reconnect-required state.
9. Verify an emergency call and a sensitive email stop for human review and create ALMA/audit records.
10. Confirm the cron invocations reject a missing or incorrect `CRON_SECRET`.

Credential-dependent smoke tests are intentionally non-destructive. Provider send, real webhook delivery, OAuth consent, audio retrieval, and cron scheduling require manual verification in the production provider accounts.
# Autonomous email office

Apply migrations in filename order, ending with `202607220001_autonomous_email_office.sql`. Do not apply that migration before `202607210001_launch_communications_compat.sql`.

Configure Gmail with `openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send`; its redirect is `https://YOUR_DOMAIN/api/oauth/google/callback`. Configure Microsoft with `openid email offline_access User.Read Mail.Read Mail.ReadWrite Mail.Send`; its redirect is `https://YOUR_DOMAIN/api/oauth/microsoft/callback`.

Set `CRON_SECRET` in the deployment environment. `vercel.json` runs `/api/cron/email` daily at 06:15 UTC and `/api/cron/alma` daily at 06:30 UTC. Vercel supplies `Authorization: Bearer CRON_SECRET`; external schedulers must do the same. The email route imports and immediately processes up to 50 ready jobs, while the ALMA route repairs backlog and expired locks. Environment variables alone do not run jobs.

Keep `EMAIL_AUTOREPLY_MODE=draft` for launch. Sending requires `EMAIL_AUTOREPLY_MODE=send`, `AUTONOMY_MODE=autopilot`, `ENABLE_OUTBOUND_COMMUNICATIONS=true`, confidence at or above `EMAIL_AUTOREPLY_MIN_CONFIDENCE`, and every deterministic safety gate to pass. `EMAIL_THREAD_REPLY_RATE_LIMIT` defaults to one automated reply per thread per hour. Verify with non-production Gmail and Microsoft tenants: OAuth refresh/revocation, initial and delta imports, provider-threaded drafts, safe attachments, approval, retry/dead-letter recovery, shared staff visibility, and reconnect state. Never use live resident messages for initial verification.
