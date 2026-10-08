# LegacyOS Outlook handoff — October 2026

This release is for Legacy Real Estate's **internal** staff. It imports mail from the Microsoft 365 account that signs into the OAuth prompt, classifies and scores leads, creates maintenance and follow-up work, and prepares editable responses. Staff members click **Send from connected inbox** to send through Microsoft Graph. The release is configured **not** to send unattended automatic replies.

## 1. Before pushing the ZIP

Extract the ZIP on the Legacy computer. Run `PUSH-TO-LEGACY.ps1` from its `legacyos-main` folder. The script clones `legacyrealestate/legacyos` into a fresh Desktop folder, copies only reviewed source (no local `.env`), runs `npm ci`, tests, lint, and build, then asks you to type `PUSH` before committing and pushing `main`. Git for Windows and Node.js LTS must be installed. GitHub may open a browser for sign-in. Do not upload the ZIP itself to GitHub.

The script checks that GitHub `main` still matches the reviewed ZIP baseline. If it says GitHub changed, **stop** and request a new review; do not force-push or overwrite newer work. It does **not** move Supabase data, change Vercel environment values, apply database migrations, configure Microsoft, or prove live email delivery. Finish the following setup in Legacy-owned accounts.

## 2. Vercel Production environment

Enter these in Legacy's **legacyos** Vercel project, not SEAINT's project. Use the same project that owns the custom domain. Secret values go only into Vercel, never this file, chat, or GitHub.

| Variable | Value or source |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Active **LEGACYOS** Supabase project URL (US West), not the paused project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same active project's anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same active project's server-only service-role key |
| `NEXT_PUBLIC_APP_URL` | `https://www.legacynashvilleos.space` if that is the canonical working site |
| `APP_ENCRYPTION_KEY` | Copy the **exact old value** if preserving previously connected OAuth tokens; otherwise generate a new base64 32-byte key before first connection |
| `LEGACY_ADMIN_EMAILS` | Comma-separated actual approved LegacyOS administrator login emails |
| `LEGACY_STAFF_EMAILS` | Comma-separated actual approved LegacyOS staff login emails |
| `MICROSOFT_CLIENT_ID` | Legacy's Entra application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | Legacy's Entra client secret **Value**, not ID |
| `MICROSOFT_TENANT_ID` | Legacy's Entra directory (tenant) ID |
| `OPENAI_API_KEY` | Legacy-owned OpenAI API key for tailored drafts |
| `OPENAI_MODEL` | `gpt-5-mini` |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` |
| `OPENAI_OCR_MODEL` | Optional; `gpt-5-mini` for image uploads |
| `AI_ASSISTANCE_ENABLED` | `true` to generate tailored drafts; if AI fails, deterministic category drafts remain |
| `EMAIL_AUTOREPLY_MODE` | `draft` |
| `AUTONOMY_MODE` | `draft` |
| `ENABLE_STAFF_EMAIL_SEND` | `true` for an authenticated staff member to click Send |
| `ENABLE_OUTBOUND_COMMUNICATIONS` | `false` for no unattended sending or other outbound channels |
| `CRON_SECRET` | A newly generated random secret for scheduled jobs |
| `EMAIL_AUTOREPLY_MIN_CONFIDENCE` | `0.90` |
| `EMAIL_THREAD_REPLY_RATE_LIMIT` | `1` |
| `EMAIL_ATTACHMENT_MAX_BYTES` | `10485760` |

To generate a new key on PowerShell, run each block **once** and keep the results private:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Use that for `CRON_SECRET`; generate a **different** 32-byte value for `APP_ENCRYPTION_KEY` only when this project does not already have encrypted mailbox connections. Changing an established encryption key breaks stored OAuth tokens and requires reconnecting. Select Production and redeploy after saving environment changes. `EMAIL_FROM`, Resend, Twilio, ElevenLabs, and Elevate keys are **not needed** for this Outlook-email launch.

## 3. Microsoft 365 / Entra

Legacy's IT administrator must create/manage an app registration in **Legacy's own tenant**. Web redirect URI must match `NEXT_PUBLIC_APP_URL` exactly, including `www`:

```text
https://www.legacynashvilleos.space/api/oauth/microsoft/callback
```

Request delegated Microsoft Graph permissions `User.Read`, `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, plus `openid`, `email`, and `offline_access`; grant tenant admin consent if required. Ask IT to confirm that the **specific work account which signs in has the mail in its own Inbox**. This implementation uses Graph `/me/mailFolders/inbox`. A separate delegated/shared mailbox is **not** automatically selected just because that user has access to it. If leasing mail lives only in a separate shared mailbox, stop and have IT decide whether to forward/copy that mail into the connected account's Inbox or commission an explicit shared-mailbox integration. Do not enable interactive sign-in on a shared mailbox just to bypass this limitation.

## 4. Database and first live test

Confirm the active Supabase project has the schema migrations from `supabase/migrations` applied **in filename order**. Take a database backup and inspect migration history with the project owner before applying any missing migration. Do not run old migrations blindly on a populated live project.

1. In Legacy Vercel, confirm `main` deploy is **Ready**, all Production env values are saved, and the custom domain points to that deployment.
2. Sign into LegacyOS with an allowlisted active staff account; an admin clicks **Connect Microsoft 365**, signs in with the actual work mailbox, and grants consent. The app shows the connected email address. If it is the wrong mailbox, disconnect and reconnect the right one.
3. Click **Sync Microsoft 365**. Initial import covers up to the last 30 days and advances a checkpoint in small pages. Repeat Sync if there is more history or a processing backlog. The Vercel Hobby schedule also imports daily at 06:15 UTC and repairs ALMA jobs daily at 06:30 UTC, **not in real time**.
4. Send dedicated test mail to that mailbox: a leasing inquiry, a callback request, a maintenance request, and a regular/vendor message. Confirm classification, contact/lead/ticket/task, and editable tailored reply where appropriate. Sensitive/urgent content must remain staff review.
5. Edit a test reply, verify recipient/subject/body, click **Send from connected inbox**, then confirm it in the same mailbox's **Sent Items** and the recipient's Inbox. Graph acceptance is not proof of delivery. Staff can save a provider draft without sending.
6. Leave `EMAIL_AUTOREPLY_MODE=draft`, `AUTONOMY_MODE=draft`, and `ENABLE_OUTBOUND_COMMUNICATIONS=false`. Turning on all three outbound auto-send gates is a separate decision and requires another production test.

## Honest handoff limits

Unit tests, lint, and production build validate code structure; this ZIP cannot validate Legacy's real Microsoft consent, mailbox contents, Supabase migration state, Vercel secrets, or end-to-end delivery. The production build uses Next.js's supported webpack mode, which passed locally. `npm audit --omit=dev` still reports moderate dependency advisories, with no high/critical production advisories at packaging time. Those should be tracked separately. Do not promise a fully live inbox until step 4 passes against the actual Legacy tenant.
