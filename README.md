# LegacyOS

LegacyOS is the internal Legacy Real Estate operations workspace. For the Microsoft 365 email-and-lead handoff, begin with [HANDOFF-LEGACY.md](HANDOFF-LEGACY.md). It contains the exact Legacy-owned accounts, Vercel keys, migration check, work-mailbox limitation, and live smoke test. The push script is `PUSH-TO-LEGACY.ps1`.

## What is live

- Phone CRM: signed ElevenLabs post-call events create searchable call records, transcripts, urgency, emergency flags, contacts, and maintenance tickets.
- Twilio: signed message delivery callbacks update vendor dispatch; signed call callbacks update the phone CRM.
- ALMA: authenticated workspace chat answers from current calls, open maintenance, vendors, CRM contacts, and email—not fabricated data.
- Email: Microsoft 365 OAuth imports the signed-in work account's Inbox; email intake classifies leads, organizes maintenance, and prepares staff-reviewed drafts. Resend is an optional separate provider, not required for the Microsoft launch.
- CRM: contacts and properties are connected to phone and email activity.
- Control plane: admins can see which environment integrations are ready without exposing secret values.
- Safety: emergency, life-safety, legal, and explicit human requests always require staff review.

## Local setup

1. Install dependencies:

```bash
npm ci
```

2. Copy `.env.example` to `.env.local` and enter your own values.
3. Review the active Supabase project's migration history against **all** files in `supabase/migrations` in filename order; back up and apply only missing migrations using the Supabase migration runner. Do not replay old SQL blindly on live data.

4. Start the app:

```bash
npm run dev
```

5. Verify before deployment:

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```

## Provider webhooks

Configure these exact HTTPS endpoints after deploying:

```text
ElevenLabs post-call webhook: https://YOUR_DOMAIN/api/elevenlabs
Twilio status callback:       https://YOUR_DOMAIN/api/twilio/status
Resend receiving webhook:     https://YOUR_DOMAIN/api/email/webhook
```

The ElevenLabs and Resend endpoints reject unsigned or stale requests. The Twilio endpoint validates signatures against `NEXT_PUBLIC_APP_URL`, so that value must exactly match the canonical deployed origin and must not end with an alternate preview hostname.

## Automation modes

- `AUTONOMY_MODE=assist`: ALMA provides recommendations only.
- `AUTONOMY_MODE=draft`: routine workflows may create drafts and records.
- `AUTONOMY_MODE=autopilot`: explicitly enabled routine workflows may perform external actions.
- `EMAIL_AUTOREPLY_MODE=off|draft|send`: controls the email reply workflow.
- `ENABLE_OUTBOUND_COMMUNICATIONS=true`: enables Twilio SMS; otherwise vendor notifications remain preview-only.

`EMAIL_AUTOREPLY_MODE=draft`, `AUTONOMY_MODE=draft`, and `ENABLE_OUTBOUND_COMMUNICATIONS=false` prevent unattended auto-replies for this handoff. `ENABLE_STAFF_EMAIL_SEND=true` separately permits an authenticated staff member to click Send from the connected Outlook mailbox. Urgent, emergency, legal, and human-requested messages remain in staff review.
# Autonomous shared inbox

Gmail and Microsoft imports enqueue one idempotent intake job per provider message. ALMA suppresses loops and automated senders, normalizes contacts, classifies mail, creates lead follow-ups or maintenance tickets, and creates a provider-threaded draft for routine actionable messages. Emergency, legal, fair-housing, financial-dispute, escalated, and explicit-human-request messages remain human-reviewed. See `DEPLOYMENT.md` for scopes, cron schedules, migration order, and credential-dependent launch checks.
