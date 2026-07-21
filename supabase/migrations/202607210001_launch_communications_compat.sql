-- Launch compatibility after the 202607200001 and 202607200002 operations migrations.
-- Reconciles autonomous-operations and provider-OAuth table shapes additively.

alter table public.provider_connections add column if not exists shared_with_staff boolean not null default true;

alter table public.email_threads add column if not exists connection_id uuid references public.provider_connections(id) on delete cascade;
alter table public.email_threads add column if not exists participants jsonb not null default '[]'::jsonb;
alter table public.email_threads add column if not exists property text;
alter table public.email_threads add column if not exists ticket_id uuid references public.maintenance_tickets(id) on delete set null;
alter table public.email_threads add column if not exists tags text[] not null default '{}';
alter table public.email_threads add column if not exists internal_notes text;
alter table public.email_threads add column if not exists follow_up_at timestamptz;
alter table public.email_threads add column if not exists automation_disabled boolean not null default false;
alter table public.email_threads add column if not exists alma_classification text;
alter table public.email_threads add column if not exists alma_summary text;
alter table public.email_threads add column if not exists alma_questions jsonb not null default '[]'::jsonb;
alter table public.email_threads add column if not exists alma_requested_actions jsonb not null default '[]'::jsonb;
alter table public.email_threads add column if not exists alma_deadlines jsonb not null default '[]'::jsonb;
alter table public.email_threads add column if not exists alma_promises jsonb not null default '[]'::jsonb;
alter table public.email_threads add column if not exists alma_reason text;
alter table public.email_threads add column if not exists alma_draft_text text;
alter table public.email_threads add column if not exists updated_at timestamptz not null default now();
alter table public.email_threads alter column contact_email drop not null;
create unique index if not exists email_threads_connection_provider_unique
  on public.email_threads(connection_id, provider_thread_id) where connection_id is not null;

alter table public.email_messages add column if not exists connection_id uuid references public.provider_connections(id) on delete cascade;
alter table public.email_messages add column if not exists internet_message_id text;
alter table public.email_messages add column if not exists sender jsonb;
alter table public.email_messages add column if not exists recipients jsonb not null default '[]'::jsonb;
alter table public.email_messages add column if not exists cc jsonb not null default '[]'::jsonb;
alter table public.email_messages add column if not exists body_text text;
alter table public.email_messages add column if not exists body_html text;
alter table public.email_messages add column if not exists attachment_metadata jsonb not null default '[]'::jsonb;
alter table public.email_messages add column if not exists is_read boolean not null default false;
alter table public.email_messages add column if not exists provider_sent_at timestamptz;
alter table public.email_messages add column if not exists status text not null default 'received';
alter table public.email_messages add column if not exists references_header text;
alter table public.email_messages add column if not exists in_reply_to text;
alter table public.email_messages add column if not exists idempotency_key text;
alter table public.email_messages add column if not exists provider_result jsonb;
alter table public.email_messages alter column from_email drop not null;
alter table public.email_messages alter column subject drop not null;
create unique index if not exists email_messages_connection_provider_unique
  on public.email_messages(connection_id, provider_message_id) where connection_id is not null and provider_message_id is not null;

alter table public.integration_events add column if not exists external_id text;
alter table public.integration_events add column if not exists safe_detail jsonb not null default '{}'::jsonb;
alter table public.integration_events add column if not exists error_code text;
alter table public.integration_events alter column provider_event_id drop not null;
create unique index if not exists integration_events_smoke_unique
  on public.integration_events(provider,event_type,external_id) where external_id is not null;

alter table public.automation_runs add column if not exists provider_result jsonb;
alter table public.automation_runs add column if not exists retry_count integer not null default 0;
alter table public.automation_runs add column if not exists actor_id uuid references auth.users(id);
alter table public.automation_runs add column if not exists updated_at timestamptz not null default now();

alter table public.maintenance_tickets add column if not exists employee_assignee uuid references auth.users(id);
alter table public.maintenance_tickets add column if not exists internal_notes text;
alter table public.maintenance_tickets add column if not exists call_outcome text;
alter table public.maintenance_tickets add column if not exists failure_reason text;
alter table public.maintenance_tickets add column if not exists transcript_turns jsonb not null default '[]'::jsonb;
alter table public.maintenance_tickets add column if not exists follow_up_status text not null default 'none';

alter table public.call_records add column if not exists failure_reason text;
alter table public.call_records add column if not exists transcript_turns jsonb not null default '[]'::jsonb;
alter table public.call_records add column if not exists employee_assignee uuid references auth.users(id);
alter table public.call_records add column if not exists internal_notes text;
alter table public.call_records add column if not exists follow_up_status text not null default 'none';
