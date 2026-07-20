# LegacyOS

LegacyOS is the autonomous operations system for Legacy Nashville. It connects verified phone and email events to a live call CRM, maintenance workflows, contacts, properties, vendor dispatch, operational alerts, and the private ALMA assistant.

## What is live

- Phone CRM: signed ElevenLabs post-call events create searchable call records, transcripts, urgency, emergency flags, contacts, and maintenance tickets.
- Twilio: signed message delivery callbacks update vendor dispatch; signed call callbacks update the phone CRM.
- ALMA: authenticated workspace chat answers from current calls, open maintenance, vendors, CRM contacts, and email—not fabricated data.
- Email: signed Resend receiving webhooks store inbound messages, classify urgency, generate ALMA drafts, and optionally send policy-safe routine replies.
- CRM: contacts and properties are connected to phone and email activity.
- Control plane: admins can see which environment integrations are ready without exposing secret values.
- Safety: emergency, life-safety, legal, and explicit human requests always require staff review.

## Local setup

1. Install dependencies:

```bash
npm ci
```

2. Copy `.env.example` to `.env.local` and enter your own values.
3. Apply the Supabase migrations in timestamp order:

```text
supabase/migrations/202607170001_pilot_hardening.sql
supabase/migrations/202607200001_autonomous_operations.sql
```

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

`EMAIL_AUTOREPLY_MODE=send` sends only when `AUTONOMY_MODE=autopilot`. Urgent, emergency, legal, and human-requested messages remain in review.
