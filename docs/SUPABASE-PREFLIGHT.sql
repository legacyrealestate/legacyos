-- LegacyOS pilot preflight checks.
-- Read-only: run before applying supabase/migrations/202607170001_pilot_hardening.sql.
-- Every query should return zero rows before the migration is applied.
-- On a fresh project where a referenced table does not exist yet, that specific
-- check can be skipped; the migration creates the missing table.

select id, status
from public.maintenance_tickets
where status not in (
  'New','Open','Needs Review','Vendor Recommended','Vendor Approved',
  'Notification Queued','Sent','Delivered','Failed','In Progress',
  'Resolved','Closed','Emergency Escalated','Manually Contacted'
);

select id, status
from public.vendor_jobs
where status not in (
  'Recommended','Approved','Notification Queued','Sent','Delivered','Failed',
  'Manually Contacted','Closed','Reconciliation Required'
);

select provider, provider_conversation_id, count(*)
from public.maintenance_tickets
where provider is not null and provider_conversation_id is not null
group by provider, provider_conversation_id
having count(*) > 1;

select ticket_id, count(*)
from public.vendor_jobs
where closed_at is null
  and (
    status in ('Approved','Notification Queued','Sent','Delivered','Manually Contacted','Reconciliation Required')
    or notification_attempt_key is not null
    or provider_message_sid is not null
    or notification_status = 'Sending'
  )
group by ticket_id
having count(*) > 1;

select provider_message_sid, count(*)
from public.vendor_jobs
where provider_message_sid is not null
group by provider_message_sid
having count(*) > 1;

select notification_attempt_key, count(*)
from public.vendor_jobs
where notification_attempt_key is not null
group by notification_attempt_key
having count(*) > 1;

select ticket_id, type, count(*)
from public.ticket_updates
where type in ('intake', 'escalation')
group by ticket_id, type
having count(*) > 1;

select vendor_job_id, type, count(*)
from public.ticket_updates
where vendor_job_id is not null
  and type in ('vendor_notification_preview', 'vendor_notification_sent', 'vendor_notification_failed')
group by vendor_job_id, type
having count(*) > 1;

select related_ticket_id, type, count(*)
from public.operations_feed
where related_ticket_id is not null and type in ('maintenance_intake', 'emergency')
group by related_ticket_id, type
having count(*) > 1;

select related_ticket_id, type, count(*)
from public.notifications
where related_ticket_id is not null and type = 'emergency' and acknowledged_at is null
group by related_ticket_id, type
having count(*) > 1;
