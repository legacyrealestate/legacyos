-- LegacyOS autonomous operations foundation.
-- Adds a provider-neutral call CRM, contact/property CRM, email inbox/drafts,
-- automation audit records, and idempotent provider event storage.

create table if not exists public.crm_properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text,
  state text,
  postal_code text,
  units integer not null default 0 check (units >= 0),
  status text not null default 'Active' check (status in ('Active', 'Inactive', 'Onboarding')),
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  contact_type text not null default 'Resident' check (contact_type in ('Resident', 'Owner', 'Lead', 'Vendor', 'Other')),
  full_name text not null,
  email text,
  phone text,
  property_id uuid references public.crm_properties(id) on delete set null,
  property_label text,
  unit text,
  status text not null default 'Active' check (status in ('Active', 'Inactive', 'Lead')),
  tags text[] not null default '{}',
  notes text,
  last_contact_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_records (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_call_id text not null,
  transport_call_id text,
  provider_agent_id text,
  maintenance_ticket_id uuid references public.maintenance_tickets(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  from_phone text,
  to_phone text,
  caller_name text,
  property_label text,
  unit text,
  category text not null default 'General',
  urgency text not null default 'Medium' check (urgency in ('Low', 'Medium', 'High', 'Urgent', 'Emergency')),
  emergency boolean not null default false,
  status text not null default 'completed',
  disposition text,
  sentiment text,
  summary text,
  transcript text,
  recording_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_call_id)
);

create table if not exists public.email_threads (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  provider_thread_id text,
  subject text not null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  contact_name text,
  contact_email text not null,
  status text not null default 'Open' check (status in ('Open', 'Drafted', 'Replied', 'Closed', 'Needs Review')),
  urgency text not null default 'Medium' check (urgency in ('Low', 'Medium', 'High', 'Urgent', 'Emergency')),
  assigned_to uuid references auth.users(id),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.email_threads(id) on delete cascade,
  provider_message_id text,
  direction text not null check (direction in ('inbound', 'outbound', 'draft')),
  from_email text not null,
  to_emails text[] not null default '{}',
  subject text not null,
  text_body text,
  html_body text,
  ai_generated boolean not null default false,
  approved_by uuid references auth.users(id),
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workflow text not null,
  entity_type text,
  entity_id uuid,
  mode text not null default 'assist' check (mode in ('assist', 'draft', 'autopilot')),
  status text not null check (status in ('started', 'completed', 'blocked', 'failed', 'needs_review')),
  decision text,
  reason text,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create index if not exists crm_contacts_name_idx on public.crm_contacts(full_name);
create index if not exists crm_contacts_phone_idx on public.crm_contacts(phone) where phone is not null;
create index if not exists crm_contacts_email_idx on public.crm_contacts(lower(email)) where email is not null;
create index if not exists crm_properties_address_idx on public.crm_properties(address);
create index if not exists call_records_started_idx on public.call_records(started_at desc nulls last, created_at desc);
create index if not exists call_records_urgency_idx on public.call_records(urgency, created_at desc);
create index if not exists call_records_ticket_idx on public.call_records(maintenance_ticket_id) where maintenance_ticket_id is not null;
create index if not exists call_records_transport_idx on public.call_records(transport_call_id) where transport_call_id is not null;
create index if not exists email_threads_last_message_idx on public.email_threads(last_message_at desc);
create index if not exists email_messages_thread_idx on public.email_messages(thread_id, created_at);
create unique index if not exists email_messages_provider_id_idx
  on public.email_messages(provider_message_id) where provider_message_id is not null;
create index if not exists automation_runs_created_idx on public.automation_runs(created_at desc);

alter table public.crm_properties enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.call_records enable row level security;
alter table public.email_threads enable row level security;
alter table public.email_messages enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integration_events enable row level security;

drop policy if exists "staff read crm properties" on public.crm_properties;
create policy "staff read crm properties" on public.crm_properties for select
  to authenticated using (public.is_legacy_staff());
drop policy if exists "staff read crm contacts" on public.crm_contacts;
create policy "staff read crm contacts" on public.crm_contacts for select
  to authenticated using (public.is_legacy_staff());
drop policy if exists "staff read call records" on public.call_records;
create policy "staff read call records" on public.call_records for select
  to authenticated using (public.is_legacy_staff());
drop policy if exists "staff read email threads" on public.email_threads;
create policy "staff read email threads" on public.email_threads for select
  to authenticated using (public.is_legacy_staff());
drop policy if exists "staff read email messages" on public.email_messages;
create policy "staff read email messages" on public.email_messages for select
  to authenticated using (public.is_legacy_staff());
drop policy if exists "staff read automation runs" on public.automation_runs;
create policy "staff read automation runs" on public.automation_runs for select
  to authenticated using (public.is_legacy_staff());

revoke all on table public.crm_properties, public.crm_contacts, public.call_records,
  public.email_threads, public.email_messages, public.automation_runs, public.integration_events
  from anon, authenticated;
grant select on table public.crm_properties, public.crm_contacts, public.call_records,
  public.email_threads, public.email_messages, public.automation_runs
  to authenticated;
grant all on table public.crm_properties, public.crm_contacts, public.call_records,
  public.email_threads, public.email_messages, public.automation_runs, public.integration_events
  to service_role;
