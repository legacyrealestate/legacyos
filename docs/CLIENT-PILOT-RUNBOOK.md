# Client Pilot Runbook

## Supported Workflows

- ElevenLabs maintenance intake to LegacyOS ticket.
- Staff-created maintenance intake.
- Ticket review and status updates.
- Vendor recommendation for staff approval.
- Vendor notification preview while `ENABLE_OUTBOUND_COMMUNICATIONS=false`.
- Twilio delivery tracking when outbound messaging is explicitly enabled.
- Emergency notification and staff acknowledgment records.
- Private document upload and signed document access.
- Operations/activity timeline.

## Unsupported Workflows

- Autonomous vendor dispatch.
- Automatic emergency-services dispatch.
- Buildium synchronization.
- Public lease, ledger, owner statement, or HOA document sharing.
- Inbound voice answering directly inside LegacyOS.
- Inbound vendor SMS handling or two-way vendor messaging.

## Human Approval

Staff must approve vendor selection before notifications are queued. A vendor is not considered dispatched until a real notification succeeds or staff records manual contact.

Vendor SMS is one-way in the pilot. The outbound message includes approved work-order context only and instructs the vendor to use the existing approved follow-up process rather than replying by SMS.

## Provider Configuration

Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS origin before enabling outbound SMS. LegacyOS generates the Twilio status callback URL server-side as `/api/twilio/status`; browser-provided callback URLs are ignored.

Set `ELEVENLABS_AGENT_ID` only when the pilot should accept signed post-call transcription events from one specific ElevenLabs agent.

## Emergency Fallback

For emergencies, staff must acknowledge the LegacyOS notification and use the existing property-management emergency procedure to contact vendors or emergency services directly. LegacyOS can record the event but is not the emergency authority.

The dashboard polls for unacknowledged notifications and refreshes on window focus. This is dashboard monitoring only; it is not external emergency paging, 911 dispatch, or guaranteed out-of-band alerting.

## Failure Reporting

Capture the ticket ID, timestamp, staff user, observed behavior, and expected behavior. Do not paste raw call transcripts or secrets into support channels.
