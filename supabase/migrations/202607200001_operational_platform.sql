-- LegacyOS operational platform (additive/idempotent).
-- Review and apply after 202607170001_pilot_hardening.sql.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text, phone text, email text, property text, unit text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists contacts_phone_unique on public.contacts(phone) where phone is not null;
create unique index if not exists contacts_email_unique on public.contacts(lower(email)) where email is not null;

alter table public.maintenance_tickets add column if not exists contact_id uuid references public.contacts(id) on delete set null;
alter table public.maintenance_tickets add column if not exists direction text;
alter table public.maintenance_tickets add column if not exists sentiment text;
alter table public.maintenance_tickets add column if not exists disposition text;
alter table public.maintenance_tickets add column if not exists recording_available boolean not null default false;
alter table public.maintenance_tickets add column if not exists twilio_call_sid text;
create index if not exists maintenance_provider_started_idx on public.maintenance_tickets(provider, call_started_at desc);

create table if not exists public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  account_email text, scopes text[] not null default '{}',
  encrypted_refresh_token text, encrypted_access_token text,
  access_token_expires_at timestamptz, status text not null default 'connected',
  last_sync_at timestamptz, last_success_at timestamptz, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, provider)
);
create table if not exists public.sync_checkpoints (
  id uuid primary key default gen_random_uuid(), provider text not null, owner_id uuid,
  stream text not null default 'default', cursor text, checkpoint jsonb not null default '{}',
  last_success_at timestamptz, last_error text, updated_at timestamptz not null default now(),
  unique(provider, owner_id, stream)
);
create table if not exists public.email_threads (
  id uuid primary key default gen_random_uuid(), connection_id uuid not null references public.provider_connections(id) on delete cascade,
  provider text not null, provider_thread_id text not null, subject text, participants jsonb not null default '[]',
  urgency text not null default 'Medium', status text not null default 'open', property text,
  contact_id uuid references public.contacts(id), ticket_id uuid references public.maintenance_tickets(id),
  last_message_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(connection_id, provider_thread_id)
);
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.email_threads(id) on delete cascade,
  connection_id uuid not null references public.provider_connections(id) on delete cascade,
  provider_message_id text not null, internet_message_id text, direction text not null,
  sender jsonb, recipients jsonb not null default '[]', cc jsonb not null default '[]', subject text,
  body_text text, body_html text, attachment_metadata jsonb not null default '[]', is_read boolean not null default false,
  provider_sent_at timestamptz, status text not null default 'received', created_at timestamptz not null default now(),
  unique(connection_id, provider_message_id)
);
create index if not exists email_threads_recent_idx on public.email_threads(last_message_at desc);
create index if not exists email_messages_thread_idx on public.email_messages(thread_id, provider_sent_at);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(), workflow text not null, entity_type text, entity_id uuid,
  mode text not null check (mode in ('assist','draft','autopilot')), decision text, reason text,
  input_snapshot jsonb not null default '{}', output_snapshot jsonb not null default '{}', provider_result jsonb,
  status text not null default 'pending', retry_count integer not null default 0, actor_id uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(), provider text not null, event_type text not null,
  external_id text, status text not null, safe_detail jsonb not null default '{}', error_code text,
  created_at timestamptz not null default now(), unique(provider, event_type, external_id)
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null,
  entity_type text, entity_id uuid, detail jsonb not null default '{}', created_at timestamptz not null default now()
);

create or replace function public.bootstrap_legacy_profile()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.profiles(id, full_name, role, active)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'staff', false)
  on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_legacy_profile on auth.users;
create trigger on_auth_user_created_legacy_profile after insert on auth.users for each row execute function public.bootstrap_legacy_profile();

alter table public.contacts enable row level security;
alter table public.provider_connections enable row level security;
alter table public.sync_checkpoints enable row level security;
alter table public.email_threads enable row level security;
alter table public.email_messages enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integration_events enable row level security;
alter table public.audit_logs enable row level security;
do $$ declare t text; begin
  foreach t in array array['contacts','email_threads','email_messages','automation_runs','integration_events','audit_logs'] loop
    execute format('drop policy if exists "staff read %1$s" on public.%1$I', t);
    execute format('create policy "staff read %1$s" on public.%1$I for select using (public.is_legacy_staff())', t);
  end loop;
end $$;
drop policy if exists "owner read provider connections" on public.provider_connections;
create policy "owner read provider connections" on public.provider_connections for select using (auth.uid() = user_id and public.is_legacy_staff());
revoke all on public.provider_connections, public.sync_checkpoints, public.automation_runs, public.integration_events, public.audit_logs from anon, authenticated;
grant select on public.provider_connections to authenticated;
revoke all on function public.bootstrap_legacy_profile() from public, anon, authenticated;

alter table public.maintenance_tickets add column if not exists classification text not null default 'unknown';
alter table public.maintenance_tickets add column if not exists classification_reason text;
alter table public.maintenance_tickets add column if not exists classification_confidence numeric;
alter table public.maintenance_tickets add column if not exists classification_policy_version text;
alter table public.maintenance_tickets add column if not exists classification_model_output jsonb;
alter table public.maintenance_tickets add column if not exists classification_corrected_by uuid references auth.users(id);
alter table public.maintenance_tickets add column if not exists classification_corrected_at timestamptz;

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(), title text not null, description text, priority text not null default 'routine',
  status text not null default 'open', due_at timestamptz, ticket_id uuid references public.maintenance_tickets(id) on delete cascade,
  contact_id uuid references public.contacts(id), assigned_to uuid references auth.users(id), idempotency_key text unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.escalation_records (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  reason text not null, status text not null default 'awaiting_acknowledgement', acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz, idempotency_key text not null unique, created_at timestamptz not null default now()
);
create table if not exists public.alma_settings (
  id boolean primary key default true check(id), mode text not null default 'observe' check(mode in ('observe','draft','execute_low_risk')),
  enabled_workflows text[] not null default '{}', updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
insert into public.alma_settings(id) values(true) on conflict(id) do nothing;
create table if not exists public.alma_jobs (
  id uuid primary key default gen_random_uuid(), job_type text not null, entity_type text not null, entity_id uuid,
  payload jsonb not null default '{}', idempotency_key text not null unique, status text not null default 'queued'
    check(status in ('queued','running','waiting_approval','completed','retry','dead_letter')),
  attempts integer not null default 0, max_attempts integer not null default 5, run_after timestamptz not null default now(),
  locked_at timestamptz, last_error text, result jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists alma_jobs_ready_idx on public.alma_jobs(status, run_after);
alter table public.crm_tasks enable row level security;
alter table public.escalation_records enable row level security;
alter table public.alma_settings enable row level security;
alter table public.alma_jobs enable row level security;
do $$ declare t text; begin foreach t in array array['crm_tasks','escalation_records','alma_settings','alma_jobs'] loop
  execute format('drop policy if exists "staff read %1$s" on public.%1$I', t);
  execute format('create policy "staff read %1$s" on public.%1$I for select using (public.is_legacy_staff())', t);
end loop; end $$;
revoke all on public.crm_tasks, public.escalation_records, public.alma_settings, public.alma_jobs from anon, authenticated;
grant select on public.crm_tasks, public.escalation_records, public.alma_settings, public.alma_jobs to authenticated;

alter table public.maintenance_tickets add column if not exists recipient_phone text;
alter table public.maintenance_tickets add column if not exists parent_call_sid text;
alter table public.maintenance_tickets add column if not exists call_duration_seconds integer;
alter table public.maintenance_tickets add column if not exists recording_sid text;
alter table public.maintenance_tickets add column if not exists transcription_sid text;
alter table public.maintenance_tickets add column if not exists provider_error_code text;
alter table public.maintenance_tickets add column if not exists provider_error_message text;
alter table public.maintenance_tickets add column if not exists secondary_provider_ids jsonb not null default '{}'::jsonb;
create unique index if not exists maintenance_twilio_call_sid_unique on public.maintenance_tickets(twilio_call_sid) where twilio_call_sid is not null;
create table if not exists public.voice_provider_events (
  id uuid primary key default gen_random_uuid(), provider text not null, provider_call_id text not null,
  event_type text not null, event_key text not null, payload_safe jsonb not null default '{}',
  occurred_at timestamptz, created_at timestamptz not null default now(), unique(provider,event_key)
);
create index if not exists voice_events_call_idx on public.voice_provider_events(provider,provider_call_id,created_at);
alter table public.voice_provider_events enable row level security;
drop policy if exists "staff read voice provider events" on public.voice_provider_events;
create policy "staff read voice provider events" on public.voice_provider_events for select using(public.is_legacy_staff());
revoke all on public.voice_provider_events from anon, authenticated;
grant select on public.voice_provider_events to authenticated;

alter table public.email_messages add column if not exists references_header text;
alter table public.email_messages add column if not exists in_reply_to text;
alter table public.email_messages add column if not exists idempotency_key text;
alter table public.email_messages add column if not exists provider_result jsonb;
create unique index if not exists email_messages_idempotency_unique on public.email_messages(idempotency_key) where idempotency_key is not null;
create table if not exists public.email_outbound_actions (
  id uuid primary key default gen_random_uuid(), connection_id uuid not null references public.provider_connections(id) on delete cascade,
  source_message_id uuid references public.email_messages(id) on delete set null, action text not null,
  idempotency_key text not null unique, request jsonb not null default '{}', status text not null default 'draft',
  provider_draft_id text, provider_message_id text, provider_result jsonb, last_error text,
  created_by uuid not null references auth.users(id), approved_by uuid references auth.users(id), approved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.email_outbound_actions enable row level security;
drop policy if exists "staff read email outbound actions" on public.email_outbound_actions;
create policy "staff read email outbound actions" on public.email_outbound_actions for select using(public.is_legacy_staff());
revoke all on public.email_outbound_actions from anon, authenticated;
grant select on public.email_outbound_actions to authenticated;
