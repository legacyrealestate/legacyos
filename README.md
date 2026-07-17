# LegacyOS

LegacyOS is the supervised operations backend for Legacy Real Estate Group. The pilot focuses on maintenance intake, ticket review, human-approved vendor notification, resident/vendor updates, private documents, and operational activity tracking.

## Architecture

- Twilio owns the phone number and SMS transport.
- ElevenLabs handles inbound voice and sends post-call transcription webhooks to LegacyOS.
- LegacyOS verifies provider webhooks, stores tickets and activity in Supabase, and presents staff review workflows.
- Supabase Auth is the only staff authentication system.
- Supabase service-role access is restricted to trusted server route handlers.

Inbound voice URL in ElevenLabs:

```text
https://legacynashvilleos.space/api/elevenlabs
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill values locally.
3. Run the app:

```bash
npm run dev
```

4. Run checks:

```bash
npm run lint
npm run test
npx tsc --noEmit
npm run build
```

## Safety Defaults

`ENABLE_OUTBOUND_COMMUNICATIONS` defaults to disabled unless it is exactly `true`. When disabled, SMS requests return a preview result and do not contact Twilio.

The legacy Twilio voice route is intentionally obsolete. Twilio should not be configured to answer inbound voice through LegacyOS.
