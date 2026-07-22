-- Autonomous shared email office. Apply after 202607210001_launch_communications_compat.sql.

alter table public.crm_contacts add column if not exists normalized_email text;
alter table public.crm_contacts add column if not exists normalized_phone text;
alter table public.crm_contacts add column if not exists company text;
alter table public.crm_contacts add column if not exists signature_text text;
alter table public.crm_contacts add column if not exists source text;
alter table public.crm_contacts add column if not exists source_email_message_id uuid references public.email_messages(id) on delete set null;
alter table public.crm_contacts add column if not exists first_contact_at timestamptz;
alter table public.crm_contacts add column if not exists staff_managed_fields text[] not null default '{}';
update public.crm_contacts set normalized_email = lower(btrim(email)) where email is not null and normalized_email is null;
update public.crm_contacts set normalized_phone = regexp_replace(phone, '[^0-9+]', '', 'g') where phone is not null and normalized_phone is null;
create unique index if not exists crm_contacts_normalized_email_unique on public.crm_contacts(normalized_email) where normalized_email is not null;
create unique index if not exists crm_contacts_normalized_phone_unique on public.crm_contacts(normalized_phone) where normalized_phone is not null;

alter table public.email_messages add column if not exists headers_safe jsonb not null default '{}'::jsonb;
alter table public.email_messages add column if not exists intake_state text not null default 'pending';
alter table public.email_messages add column if not exists processed_at timestamptz;
alter table public.email_threads add column if not exists primary_classification text;
alter table public.email_threads add column if not exists classifications text[] not null default '{}';
alter table public.email_threads add column if not exists classification_confidence numeric;
alter table public.email_threads add column if not exists classification_explanation text;
alter table public.email_threads add column if not exists extracted_fields jsonb not null default '{}'::jsonb;
alter table public.email_threads add column if not exists automation_decision text;
alter table public.email_threads add column if not exists automation_reason text;
alter table public.email_threads add column if not exists last_processing_success_at timestamptz;

alter table public.maintenance_tickets add column if not exists source_email_message_id uuid references public.email_messages(id) on delete set null;
alter table public.maintenance_tickets add column if not exists email_thread_id uuid references public.email_threads(id) on delete set null;
alter table public.maintenance_tickets add column if not exists access_instructions text;
alter table public.maintenance_tickets add column if not exists tenant_availability text;
alter table public.maintenance_tickets add column if not exists crm_contact_id uuid references public.crm_contacts(id) on delete set null;
alter table public.crm_tasks add column if not exists crm_contact_id uuid references public.crm_contacts(id) on delete set null;
create unique index if not exists maintenance_source_email_unique on public.maintenance_tickets(source_email_message_id) where source_email_message_id is not null;

create table if not exists public.email_intake_jobs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.email_messages(id) on delete cascade,
  thread_id uuid not null references public.email_threads(id) on delete cascade,
  status text not null default 'queued' check(status in ('queued','running','waiting_approval','completed','retry','dead_letter','suppressed')),
  attempts integer not null default 0,
  max_attempts integer not null default 6,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  decision jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(message_id)
);
create index if not exists email_intake_jobs_ready_idx on public.email_intake_jobs(status,run_after);

create table if not exists public.email_leads (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.email_threads(id) on delete cascade,
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  source_message_id uuid references public.email_messages(id) on delete set null,
  desired_property text,
  unit_type text,
  move_in_date date,
  price_min numeric,
  price_max numeric,
  source text not null default 'email',
  status text not null default 'New',
  next_follow_up_at timestamptz,
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(thread_id)
);

create table if not exists public.email_contact_provenance (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  message_id uuid not null references public.email_messages(id) on delete cascade,
  extracted_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(contact_id,message_id)
);

alter table public.email_intake_jobs enable row level security;
alter table public.email_leads enable row level security;
alter table public.email_contact_provenance enable row level security;
drop policy if exists "staff read email intake jobs" on public.email_intake_jobs;
create policy "staff read email intake jobs" on public.email_intake_jobs for select using(public.is_legacy_staff());
drop policy if exists "staff read email leads" on public.email_leads;
create policy "staff read email leads" on public.email_leads for select using(public.is_legacy_staff());
drop policy if exists "staff read email contact provenance" on public.email_contact_provenance;
create policy "staff read email contact provenance" on public.email_contact_provenance for select using(public.is_legacy_staff());
revoke all on public.email_intake_jobs, public.email_leads, public.email_contact_provenance from anon, authenticated;
grant select on public.email_intake_jobs, public.email_leads, public.email_contact_provenance to authenticated;
