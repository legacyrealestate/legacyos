# Microsoft 365 And Elevate Handoff

## Microsoft 365 shared leasing inbox

1. In the client's Microsoft Entra admin center, register a **Web** application named `LegacyOS`.
2. Register the exact production redirect URI:
   `https://legacynashvilleos.space/api/oauth/microsoft/callback`
3. Create a client secret and store its value securely. The secret value is shown only once.
4. Add delegated Microsoft Graph permissions: `User.Read`, `Mail.Read`, `Mail.ReadWrite`, and `Mail.Send`, plus `offline_access`, `openid`, and `profile`. Grant tenant admin consent when their policy requires it.
5. In Vercel Production, add `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `APP_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`, and `CRON_SECRET`; redeploy.
6. An admin signs into LegacyOS, opens **Inbox**, selects **Connect Microsoft 365**, and approves the shared mailbox user. Then select **Sync Microsoft 365** for the first Inbox import.

The first sync imports the connected Microsoft Inbox. Future runs use Microsoft Graph delta links and import only changes. Tokens are encrypted server-side and are never returned to the browser.

## Elevate

Elevate is prepared as a client-owned OAuth connection. In the Elevate control panel, create a confidential OAuth client with this redirect URI:

`https://legacynashvilleos.space/api/oauth/elevate/callback`

Add the supplied Elevate values in Vercel as `ELEVATE_OAUTH_CLIENT_ID`, `ELEVATE_OAUTH_CLIENT_SECRET`, `ELEVATE_OAUTH_AUTHORIZE_URL`, `ELEVATE_OAUTH_TOKEN_URL`, `ELEVATE_OAUTH_PROFILE_URL`, and `ELEVATE_OAUTH_SCOPES`. The OAuth connection is encrypted and visible in **Operations > Connections**.

Do not enable automatic calls yet. Building real calls from the client-owned Elevate number requires Elevate's approved calling or click-to-dial endpoint, scopes, and callback/webhook contract. LegacyOS already creates callback tasks from leasing email; staff can work those until that endpoint is verified.

## Outbound safety

Keep `ENABLE_OUTBOUND_COMMUNICATIONS=false`, `EMAIL_AUTOREPLY_MODE=draft`, and `AUTONOMY_MODE=draft` during the client pilot. Test real mailbox classification, lead creation, reply drafts, and callback tasks before approving low-risk automated leasing replies.
