-- LegacyOS supervised pilot schema hardening.
-- Run after reviewing in Supabase SQL editor. Do not embed credentials here.
-- First admin bootstrap is intentionally separate from this migration.
-- See docs/MANUAL-DASHBOARD-STEPS.md for the reviewed manual SQL block.

create extension if not exists pgcrypto;

do $$ begin
  create type staff_role as enum ('admin', 'staff');
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role staff_role not null default 'staff',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles alter column active set default false;

create table if not exists maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'staff_form',
  provider text,
  provider_conversation_id text,
  provider_agent_id text,
  tenant_name text not null,
  phone text,
  property text not null,
  unit text,
  issue_category text,
  issue text not null,
  urgency text not null default 'Medium',
  permission_to_enter text,
  transcript text,
  ai_summary text,
  status text not null default 'Needs Review',
  dispatch_status text,
  assigned_vendor_id uuid,
  assigned_vendor_name text,
  assigned_to_name text,
  assigned_to_phone text,
  assigned_to_email text,
  call_started_at timestamptz,
  call_ended_at timestamptz,
  call_status text,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_status_check check (status in (
    'New','Open','Needs Review','Vendor Recommended','Vendor Approved',
    'Notification Queued','Sent','Delivered','Failed','In Progress',
    'Resolved','Closed','Emergency Escalated','Manually Contacted'
  )),
  constraint maintenance_provider_conversation_unique unique (provider, provider_conversation_id)
);

alter table maintenance_tickets add column if not exists source text not null default 'staff_form';
alter table maintenance_tickets add column if not exists provider text;
alter table maintenance_tickets add column if not exists provider_conversation_id text;
alter table maintenance_tickets add column if not exists provider_agent_id text;
alter table maintenance_tickets add column if not exists tenant_name text;
alter table maintenance_tickets add column if not exists phone text;
alter table maintenance_tickets add column if not exists property text;
alter table maintenance_tickets add column if not exists unit text;
alter table maintenance_tickets add column if not exists issue_category text;
alter table maintenance_tickets add column if not exists issue text;
alter table maintenance_tickets add column if not exists urgency text not null default 'Medium';
alter table maintenance_tickets add column if not exists permission_to_enter text;
alter table maintenance_tickets add column if not exists transcript text;
alter table maintenance_tickets add column if not exists ai_summary text;
alter table maintenance_tickets add column if not exists status text not null default 'Needs Review';
alter table maintenance_tickets add column if not exists dispatch_status text;
alter table maintenance_tickets add column if not exists assigned_vendor_id uuid;
alter table maintenance_tickets add column if not exists assigned_vendor_name text;
alter table maintenance_tickets add column if not exists assigned_to_name text;
alter table maintenance_tickets add column if not exists assigned_to_phone text;
alter table maintenance_tickets add column if not exists assigned_to_email text;
alter table maintenance_tickets add column if not exists call_started_at timestamptz;
alter table maintenance_tickets add column if not exists call_ended_at timestamptz;
alter table maintenance_tickets add column if not exists call_status text;
alter table maintenance_tickets add column if not exists provider_metadata jsonb not null default '{}'::jsonb;
alter table maintenance_tickets add column if not exists created_by uuid references auth.users(id);
alter table maintenance_tickets add column if not exists updated_by uuid references auth.users(id);
alter table maintenance_tickets add column if not exists created_at timestamptz not null default now();
alter table maintenance_tickets add column if not exists updated_at timestamptz not null default now();

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text not null default 'General',
  phone text,
  email text,
  dispatch_keywords text[] not null default '{}',
  priority text not null default 'Standard',
  emergency_available boolean not null default false,
  active boolean not null default true,
  open_jobs integer not null default 0,
  total_dispatched integer not null default 0,
  last_dispatched_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vendors add column if not exists trade text not null default 'General';
alter table vendors add column if not exists phone text;
alter table vendors add column if not exists email text;
alter table vendors add column if not exists dispatch_keywords text[] not null default '{}';
alter table vendors add column if not exists priority text not null default 'Standard';
alter table vendors add column if not exists emergency_available boolean not null default false;
alter table vendors add column if not exists active boolean not null default true;
alter table vendors add column if not exists open_jobs integer not null default 0;
alter table vendors add column if not exists total_dispatched integer not null default 0;
alter table vendors add column if not exists last_dispatched_at timestamptz;
alter table vendors add column if not exists created_by uuid references auth.users(id);
alter table vendors add column if not exists updated_by uuid references auth.users(id);
alter table vendors add column if not exists created_at timestamptz not null default now();
alter table vendors add column if not exists updated_at timestamptz not null default now();

create table if not exists vendor_jobs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references maintenance_tickets(id) on delete cascade,
  vendor_id uuid not null references vendors(id),
  vendor_name text not null,
  issue text,
  tenant_name text,
  urgency text,
  status text not null default 'Approved',
  notification_status text not null default 'Notification Queued',
  provider_message_sid text,
  provider_status text,
  notification_attempt_key uuid,
  notification_attempted_at timestamptz,
  notification_counter_incremented_at timestamptz,
  closed_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_job_status_check check (status in (
    'Recommended','Approved','Notification Queued','Sent','Delivered','Failed','Manually Contacted','Closed','Reconciliation Required'
  ))
);

alter table vendor_jobs add column if not exists notification_status text not null default 'Notification Queued';
alter table vendor_jobs add column if not exists provider_message_sid text;
alter table vendor_jobs add column if not exists provider_status text;
alter table vendor_jobs add column if not exists notification_attempt_key uuid;
alter table vendor_jobs add column if not exists notification_attempted_at timestamptz;
alter table vendor_jobs add column if not exists notification_counter_incremented_at timestamptz;
alter table vendor_jobs add column if not exists closed_at timestamptz;
alter table vendor_jobs add column if not exists approved_by uuid references auth.users(id);
alter table vendor_jobs add column if not exists updated_at timestamptz not null default now();

create table if not exists ticket_updates (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references maintenance_tickets(id) on delete cascade,
  vendor_job_id uuid references vendor_jobs(id) on delete set null,
  type text not null,
  title text not null,
  description text,
  provider_message_sid text,
  provider_status text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ticket_updates add column if not exists vendor_job_id uuid references vendor_jobs(id) on delete set null;
alter table ticket_updates add column if not exists provider_message_sid text;
alter table ticket_updates add column if not exists provider_status text;
alter table ticket_updates add column if not exists created_by uuid references auth.users(id);
alter table ticket_updates add column if not exists updated_at timestamptz not null default now();

create table if not exists operations_feed (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  description text,
  related_ticket_id uuid references maintenance_tickets(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table operations_feed add column if not exists related_ticket_id uuid references maintenance_tickets(id) on delete set null;
alter table operations_feed add column if not exists created_by uuid references auth.users(id);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text,
  related_ticket_id uuid references maintenance_tickets(id) on delete set null,
  read_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table notifications add column if not exists type text;
alter table notifications add column if not exists related_ticket_id uuid references maintenance_tickets(id) on delete set null;
alter table notifications add column if not exists read_at timestamptz;
alter table notifications add column if not exists acknowledged_at timestamptz;
alter table notifications add column if not exists acknowledged_by uuid references auth.users(id);

create table if not exists client_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  priority text not null default 'Medium',
  status text not null default 'Requested',
  requested_by text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table client_requests add column if not exists category text not null default 'General';
alter table client_requests add column if not exists priority text not null default 'Medium';
alter table client_requests add column if not exists requested_by text;
alter table client_requests add column if not exists notes text;
alter table client_requests add column if not exists created_by uuid references auth.users(id);
alter table client_requests add column if not exists updated_at timestamptz not null default now();

create table if not exists command_memory (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  response text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists maintenance_created_at_idx on maintenance_tickets(created_at desc);
create index if not exists maintenance_status_idx on maintenance_tickets(status);
create index if not exists vendors_trade_active_idx on vendors(trade, active);
create index if not exists ticket_updates_ticket_idx on ticket_updates(ticket_id, created_at desc);
create index if not exists operations_feed_created_idx on operations_feed(created_at desc);

alter table public.maintenance_tickets drop constraint if exists maintenance_status_check;
alter table public.maintenance_tickets add constraint maintenance_status_check check (status in (
  'New','Open','Needs Review','Vendor Recommended','Vendor Approved',
  'Notification Queued','Sent','Delivered','Failed','In Progress',
  'Resolved','Closed','Emergency Escalated','Manually Contacted'
));

alter table public.vendor_jobs drop constraint if exists vendor_job_status_check;
alter table public.vendor_jobs add constraint vendor_job_status_check check (status in (
  'Recommended','Approved','Notification Queued','Sent','Delivered','Failed',
  'Manually Contacted','Closed','Reconciliation Required'
));

do $$
begin
  if exists (
    select 1 from public.maintenance_tickets
    where provider is not null and provider_conversation_id is not null
    group by provider, provider_conversation_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate provider conversation IDs must be resolved before applying unique constraints.';
  end if;

  if exists (
    select 1 from public.vendor_jobs
    where closed_at is null
      and (
        status in ('Approved','Notification Queued','Sent','Delivered','Manually Contacted','Reconciliation Required')
        or notification_attempt_key is not null
        or provider_message_sid is not null
        or notification_status = 'Sending'
      )
    group by ticket_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate active vendor jobs must be resolved before applying unique constraints.';
  end if;

  if exists (
    select 1 from public.vendor_jobs
    where provider_message_sid is not null
    group by provider_message_sid
    having count(*) > 1
  ) then
    raise exception 'Duplicate Twilio MessageSid values must be resolved before applying unique constraints.';
  end if;

  if exists (
    select 1 from public.vendor_jobs
    where notification_attempt_key is not null
    group by notification_attempt_key
    having count(*) > 1
  ) then
    raise exception 'Duplicate vendor notification attempt keys must be resolved before applying unique constraints.';
  end if;

  if exists (
    select 1 from public.ticket_updates
    where type in ('intake', 'escalation')
    group by ticket_id, type
    having count(*) > 1
  ) then
    raise exception 'Duplicate intake or escalation ticket updates must be resolved before applying unique constraints.';
  end if;

  if exists (
    select 1 from public.ticket_updates
    where vendor_job_id is not null
      and type in ('vendor_notification_preview', 'vendor_notification_sent', 'vendor_notification_failed')
    group by vendor_job_id, type
    having count(*) > 1
  ) then
    raise exception 'Duplicate vendor job ticket updates must be resolved before applying unique constraints.';
  end if;

  if exists (
    select 1 from public.operations_feed
    where related_ticket_id is not null
      and type in ('maintenance_intake', 'emergency')
    group by related_ticket_id, type
    having count(*) > 1
  ) then
    raise exception 'Duplicate operations feed entries must be resolved before applying unique constraints.';
  end if;

  if exists (
    select 1 from public.notifications
    where related_ticket_id is not null
      and type = 'emergency'
      and acknowledged_at is null
    group by related_ticket_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate open emergency notifications must be resolved before applying unique constraints.';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'maintenance_provider_conversation_unique'
      and conrelid = 'public.maintenance_tickets'::regclass
  ) then
    alter table public.maintenance_tickets
      add constraint maintenance_provider_conversation_unique unique (provider, provider_conversation_id);
  end if;
end $$;

create unique index if not exists maintenance_provider_conversation_idx
on maintenance_tickets(provider, provider_conversation_id)
where provider is not null and provider_conversation_id is not null;

create unique index if not exists one_active_vendor_job_per_ticket
on vendor_jobs(ticket_id)
where closed_at is null
  and (
    status in ('Approved','Notification Queued','Sent','Delivered','Manually Contacted','Reconciliation Required')
    or notification_attempt_key is not null
    or provider_message_sid is not null
    or notification_status = 'Sending'
  );

create unique index if not exists vendor_jobs_notification_attempt_key_idx
on vendor_jobs(notification_attempt_key)
where notification_attempt_key is not null;

create unique index if not exists vendor_jobs_provider_message_sid_idx
on vendor_jobs(provider_message_sid)
where provider_message_sid is not null;

create unique index if not exists ticket_updates_once_per_ticket_type_idx
on ticket_updates(ticket_id, type)
where type in ('intake', 'escalation');

create unique index if not exists ticket_updates_once_per_vendor_job_type_idx
on ticket_updates(vendor_job_id, type)
where vendor_job_id is not null
  and type in ('vendor_notification_preview', 'vendor_notification_sent', 'vendor_notification_failed');

create unique index if not exists operations_feed_once_per_ticket_type_idx
on operations_feed(related_ticket_id, type)
where related_ticket_id is not null and type in ('maintenance_intake', 'emergency');

create unique index if not exists one_open_emergency_notification_per_ticket
on notifications(related_ticket_id)
where type = 'emergency' and acknowledged_at is null;

alter table profiles enable row level security;
alter table maintenance_tickets enable row level security;
alter table vendors enable row level security;
alter table vendor_jobs enable row level security;
alter table ticket_updates enable row level security;
alter table operations_feed enable row level security;
alter table notifications enable row level security;
alter table client_requests enable row level security;
alter table command_memory enable row level security;

create or replace function public.is_legacy_staff()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, auth
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and active = true
      and role in ('admin','staff')
  );
$$;

create or replace function public.is_legacy_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, auth
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and active = true
      and role = 'admin'
  );
$$;

create or replace function public.increment_vendor_notification_counter(
  job_id_input uuid,
  actor_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  job_vendor_id uuid;
begin
  select vendor_id
  into job_vendor_id
  from public.vendor_jobs
  where id = job_id_input
  for update;

  if job_vendor_id is null then
    raise exception 'Vendor job not found.';
  end if;

  update public.vendor_jobs
  set notification_counter_incremented_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = job_id_input
    and notification_counter_incremented_at is null;

  if found then
    update public.vendors
    set total_dispatched = total_dispatched + 1,
        open_jobs = open_jobs + 1,
        last_dispatched_at = pg_catalog.now(),
        updated_by = actor_id_input,
        updated_at = pg_catalog.now()
    where id = job_vendor_id;
  end if;
end;
$$;

create or replace function public.close_vendor_job_once(
  ticket_id_input uuid,
  actor_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  vendor_count record;
begin
  for vendor_count in
    with closed_jobs as (
      update public.vendor_jobs
      set status = 'Closed',
          closed_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where ticket_id = ticket_id_input
        and closed_at is null
        and (
          status in ('Approved','Notification Queued','Sent','Delivered','Failed','Manually Contacted','Reconciliation Required')
          or notification_attempt_key is not null
          or provider_message_sid is not null
          or notification_status = 'Sending'
        )
      returning vendor_id, notification_counter_incremented_at is not null as counted
    )
    select vendor_id, count(*)::integer as close_count
    from closed_jobs
    where counted
    group by vendor_id
  loop
    update public.vendors
    set open_jobs = greatest(open_jobs - vendor_count.close_count, 0),
        updated_by = actor_id_input,
        updated_at = pg_catalog.now()
    where id = vendor_count.vendor_id;
  end loop;
end;
$$;

create or replace function public.close_vendor_job_for_callback(
  job_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  closed_vendor_id uuid;
  should_decrement boolean;
begin
  update public.vendor_jobs
  set status = 'Closed',
      closed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = job_id_input
    and closed_at is null
  returning vendor_id, notification_counter_incremented_at is not null
    into closed_vendor_id, should_decrement;

  if closed_vendor_id is not null and should_decrement then
    update public.vendors
    set open_jobs = greatest(open_jobs - 1, 0),
        updated_at = pg_catalog.now()
    where id = closed_vendor_id;
  end if;
end;
$$;

create or replace function public.create_or_repair_elevenlabs_intake(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  ticket_id uuid;
  conversation_id text := payload->>'conversation_id';
  urgency_value text := coalesce(payload->>'urgency', 'Medium');
begin
  if conversation_id is null or length(pg_catalog.btrim(conversation_id)) = 0 then
    raise exception 'conversation_id is required';
  end if;

  insert into public.maintenance_tickets (
    provider,
    provider_conversation_id,
    provider_agent_id,
    tenant_name,
    phone,
    property,
    unit,
    issue_category,
    issue,
    permission_to_enter,
    transcript,
    ai_summary,
    urgency,
    status,
    call_started_at,
    call_ended_at,
    call_status,
    provider_metadata
  )
  values (
    'elevenlabs',
    conversation_id,
    payload->>'agent_id',
    coalesce(nullif(payload->>'resident_name', ''), 'Caller'),
    payload->>'caller_phone',
    coalesce(nullif(payload->>'property', ''), 'Unassigned'),
    payload->>'unit',
    coalesce(nullif(payload->>'category', ''), 'General Maintenance'),
    coalesce(nullif(payload->>'issue', ''), 'Maintenance intake from ElevenLabs call'),
    payload->>'permission_to_enter',
    payload->>'transcript',
    payload->>'summary',
    urgency_value,
    case when urgency_value = 'Emergency' then 'Emergency Escalated' else 'Needs Review' end,
    nullif(payload->>'call_started_at', '')::timestamptz,
    nullif(payload->>'call_ended_at', '')::timestamptz,
    coalesce(payload->>'call_status', 'completed'),
    jsonb_build_object(
      'eventType', payload->>'event_type',
      'hasTranscript', coalesce(payload->>'transcript', '') <> '',
      'hasStructuredAnalysis', true
    )
  )
  on conflict (provider, provider_conversation_id) do update
    set provider_agent_id = excluded.provider_agent_id,
        ai_summary = excluded.ai_summary,
        transcript = excluded.transcript,
        provider_metadata = excluded.provider_metadata,
        updated_at = pg_catalog.now()
  returning id into ticket_id;

  insert into public.ticket_updates (ticket_id, type, title, description)
  values (ticket_id, 'intake', 'Maintenance Intake Received', payload->>'summary')
  on conflict (ticket_id, type) where type = 'intake' do nothing;

  insert into public.operations_feed (type, title, description, related_ticket_id)
  values (
    'maintenance_intake',
    'Maintenance intake needs review',
    coalesce(payload->>'category', 'General Maintenance') || ': ' || coalesce(payload->>'issue', 'Maintenance intake'),
    ticket_id
  )
  on conflict (related_ticket_id, type) where related_ticket_id is not null and type in ('maintenance_intake', 'emergency') do nothing;

  if urgency_value = 'Emergency' then
    insert into public.notifications (title, description, type, related_ticket_id)
    values (
      'Emergency Review Required',
      'Emergency ElevenLabs intake was received. External emergency procedures remain required.',
      'emergency',
      ticket_id
    )
    on conflict (related_ticket_id) where type = 'emergency' and acknowledged_at is null do nothing;
  end if;

  return ticket_id;
end;
$$;

create or replace function public.claim_vendor_notification_attempt(
  job_id_input uuid,
  attempt_key_input uuid,
  actor_id_input uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
begin
  update public.vendor_jobs
  set status = 'Notification Queued',
      notification_status = 'Sending',
      provider_status = 'sending',
      notification_attempt_key = attempt_key_input,
      notification_attempted_at = pg_catalog.now(),
      approved_by = actor_id_input,
      updated_at = pg_catalog.now()
  where id = job_id_input
    and closed_at is null
    and status = 'Approved'
    and coalesce(notification_status, 'Approved') in ('Approved', 'Disabled')
    and provider_message_sid is null
    and notification_attempt_key is null;

  return found;
end;
$$;

create or replace function public.persist_vendor_message_sid(
  job_id_input uuid,
  attempt_key_input uuid,
  message_sid_input text,
  provider_status_input text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
begin
  if message_sid_input is null or message_sid_input !~ '^SM[0-9A-Fa-f]{32}$' then
    return false;
  end if;

  update public.vendor_jobs
  set status = 'Notification Queued',
      notification_status = coalesce(provider_status_input, 'queued'),
      provider_message_sid = message_sid_input,
      provider_status = coalesce(provider_status_input, 'queued'),
      updated_at = pg_catalog.now()
  where id = job_id_input
    and notification_attempt_key = attempt_key_input
    and provider_message_sid is null;

  return found;
end;
$$;

create or replace function public.mark_vendor_job_reconciliation_required(
  job_id_input uuid,
  attempt_key_input uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
begin
  update public.vendor_jobs
  set status = 'Reconciliation Required',
      notification_status = 'Reconciliation Required',
      provider_status = coalesce(provider_status, 'unknown'),
      updated_at = pg_catalog.now()
  where id = job_id_input
    and notification_attempt_key = attempt_key_input;
end;
$$;

create or replace function public.apply_twilio_vendor_callback(
  message_sid_input text,
  provider_status_input text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  mapped_status text;
  matched_job_id uuid;
  matched_ticket_id uuid;
  current_job_status text;
  current_job_closed_at timestamptz;
  current_primary_status text;
  current_dispatch_status text;
  effective_job_status text;
  effective_dispatch_status text;
  should_update_primary boolean;
begin
  if message_sid_input is null or message_sid_input !~ '^SM[0-9A-Fa-f]{32}$' then
    raise exception 'Invalid Twilio MessageSid.';
  end if;

  select id, ticket_id, status, closed_at
  into matched_job_id, matched_ticket_id, current_job_status, current_job_closed_at
  from public.vendor_jobs
  where provider_message_sid = message_sid_input
  for update;

  if matched_job_id is null then
    return jsonb_build_object('matched', false);
  end if;

  select status, dispatch_status
  into current_primary_status, current_dispatch_status
  from public.maintenance_tickets
  where id = matched_ticket_id
  for update;

  if provider_status_input in ('queued','accepted','scheduled','sending') then
    mapped_status := 'Notification Queued';
  elsif provider_status_input = 'sent' then
    mapped_status := 'Sent';
  elsif provider_status_input = 'delivered' then
    mapped_status := 'Delivered';
  elsif provider_status_input in ('failed','undelivered','canceled') then
    mapped_status := 'Failed';
  else
    update public.vendor_jobs
    set provider_status = provider_status_input,
        updated_at = pg_catalog.now()
    where id = matched_job_id;

    update public.ticket_updates
    set provider_status = provider_status_input,
        updated_at = pg_catalog.now()
    where provider_message_sid = message_sid_input;

    return jsonb_build_object('matched', true, 'ignored', true);
  end if;

  if current_job_status = 'Closed' or current_job_closed_at is not null then
    update public.vendor_jobs
    set provider_status = provider_status_input,
        updated_at = pg_catalog.now()
    where id = matched_job_id;

    update public.ticket_updates
    set provider_status = provider_status_input,
        updated_at = pg_catalog.now()
    where provider_message_sid = message_sid_input;

    return jsonb_build_object(
      'matched', true,
      'status', current_job_status,
      'closed', true
    );
  end if;

  effective_job_status := mapped_status;
  if current_job_status in ('Delivered', 'Manually Contacted') then
    effective_job_status := current_job_status;
  elsif current_job_status = 'Failed' then
    effective_job_status := 'Failed';
  elsif current_job_status = 'Sent' and mapped_status = 'Notification Queued' then
    effective_job_status := 'Sent';
  end if;

  effective_dispatch_status := mapped_status;
  if current_dispatch_status in ('Delivered', 'Manually Contacted') then
    effective_dispatch_status := current_dispatch_status;
  elsif current_dispatch_status = 'Failed' then
    effective_dispatch_status := 'Failed';
  elsif current_dispatch_status = 'Sent' and mapped_status = 'Notification Queued' then
    effective_dispatch_status := 'Sent';
  end if;

  update public.vendor_jobs
  set status = effective_job_status,
      notification_status = provider_status_input,
      provider_status = provider_status_input,
      updated_at = pg_catalog.now()
  where id = matched_job_id;

  update public.ticket_updates
  set provider_status = provider_status_input,
      updated_at = pg_catalog.now()
  where provider_message_sid = message_sid_input;

  should_update_primary := current_primary_status = current_dispatch_status
    or current_primary_status = 'Vendor Approved';

  update public.maintenance_tickets
  set status = case when should_update_primary then effective_dispatch_status else current_primary_status end,
      dispatch_status = effective_dispatch_status,
      updated_at = pg_catalog.now()
  where id = matched_ticket_id;

  if effective_job_status = 'Failed' and current_job_status <> 'Failed' then
    perform public.close_vendor_job_for_callback(matched_job_id);
  end if;

  return jsonb_build_object(
    'matched', true,
    'jobStatus', effective_job_status,
    'dispatchStatus', effective_dispatch_status
  );
end;
$$;

create or replace function public.record_manual_vendor_contact(
  ticket_id_input uuid,
  actor_id_input uuid,
  note_input text
)
returns public.maintenance_tickets
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  job_id_value uuid;
  job_vendor_id uuid;
  already_counted boolean;
  ticket_row public.maintenance_tickets;
begin
  if note_input is null or length(pg_catalog.btrim(note_input)) = 0 then
    raise exception 'A staff note is required for manual vendor contact.';
  end if;

  select id, vendor_id, notification_counter_incremented_at is not null
  into job_id_value, job_vendor_id, already_counted
  from public.vendor_jobs
  where ticket_id = ticket_id_input
    and closed_at is null
    and status in ('Approved','Notification Queued','Sent','Failed','Reconciliation Required')
  order by created_at desc
  limit 1
  for update;

  if job_id_value is null then
    raise exception 'Manual vendor contact requires an active vendor job.';
  end if;

  update public.vendor_jobs
  set status = 'Manually Contacted',
      notification_status = 'Manually Contacted',
      notification_counter_incremented_at = coalesce(notification_counter_incremented_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where id = job_id_value;

  if not already_counted then
    update public.vendors
    set total_dispatched = total_dispatched + 1,
        open_jobs = open_jobs + 1,
        last_dispatched_at = pg_catalog.now(),
        updated_by = actor_id_input,
        updated_at = pg_catalog.now()
    where id = job_vendor_id;
  end if;

  update public.maintenance_tickets
  set status = 'Manually Contacted',
      dispatch_status = 'Manually Contacted',
      updated_by = actor_id_input,
      updated_at = pg_catalog.now()
  where id = ticket_id_input
  returning * into ticket_row;

  insert into public.ticket_updates (ticket_id, vendor_job_id, type, title, description, created_by)
  values (ticket_id_input, job_id_value, 'manual_contact', 'Vendor manually contacted', note_input, actor_id_input);

  return ticket_row;
end;
$$;

create or replace function public.update_ticket_staff_status(
  ticket_id_input uuid,
  actor_id_input uuid,
  status_input text,
  note_input text
)
returns public.maintenance_tickets
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  ticket_row public.maintenance_tickets;
begin
  if status_input not in (
    'New',
    'Open',
    'Needs Review',
    'Vendor Recommended',
    'In Progress',
    'Resolved',
    'Closed',
    'Failed'
  ) then
    raise exception 'Invalid staff ticket status.';
  end if;

  update public.maintenance_tickets
  set status = status_input,
      updated_by = actor_id_input,
      updated_at = pg_catalog.now()
  where id = ticket_id_input
  returning * into ticket_row;

  if ticket_row.id is null then
    raise exception 'Ticket not found.';
  end if;

  insert into public.ticket_updates (ticket_id, type, title, description, created_by)
  values (
    ticket_id_input,
    'status_update',
    'Status updated to ' || status_input,
    note_input,
    actor_id_input
  );

  if status_input in ('Resolved', 'Closed') then
    perform public.close_vendor_job_once(ticket_id_input, actor_id_input);
  end if;

  return ticket_row;
end;
$$;

create or replace function public.escalate_ticket_emergency(
  ticket_id_input uuid,
  actor_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
begin
  update public.maintenance_tickets
  set status = 'Emergency Escalated',
      updated_by = actor_id_input,
      updated_at = pg_catalog.now()
  where id = ticket_id_input;

  insert into public.notifications (title, description, type, related_ticket_id)
  values (
    'Emergency Review Required',
    'Staff marked a ticket as emergency. Follow external emergency procedures; LegacyOS does not dispatch emergency services.',
    'emergency',
    ticket_id_input
  )
  on conflict (related_ticket_id) where type = 'emergency' and acknowledged_at is null do nothing;

  insert into public.ticket_updates (ticket_id, type, title, description, created_by)
  values (
    ticket_id_input,
    'escalation',
    'Escalated for Emergency Review',
    'Staff marked this ticket for emergency review. External emergency procedures remain required.',
    actor_id_input
  )
  on conflict (ticket_id, type) where type in ('intake', 'escalation') do nothing;

  insert into public.operations_feed (type, title, description, related_ticket_id, created_by)
  values (
    'emergency',
    'Emergency review requested',
    'Staff escalated a maintenance ticket for immediate review.',
    ticket_id_input,
    actor_id_input
  )
  on conflict (related_ticket_id, type) where related_ticket_id is not null and type in ('maintenance_intake', 'emergency') do nothing;
end;
$$;

revoke all on function public.create_or_repair_elevenlabs_intake(jsonb) from public, anon, authenticated;
revoke all on function public.increment_vendor_notification_counter(uuid, uuid) from public, anon, authenticated;
revoke all on function public.close_vendor_job_once(uuid, uuid) from public, anon, authenticated;
revoke all on function public.close_vendor_job_for_callback(uuid) from public, anon, authenticated;
revoke all on function public.claim_vendor_notification_attempt(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.persist_vendor_message_sid(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.mark_vendor_job_reconciliation_required(uuid, uuid) from public, anon, authenticated;
revoke all on function public.apply_twilio_vendor_callback(text, text) from public, anon, authenticated;
revoke all on function public.record_manual_vendor_contact(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.update_ticket_staff_status(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.escalate_ticket_emergency(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_or_repair_elevenlabs_intake(jsonb) to service_role;
grant execute on function public.increment_vendor_notification_counter(uuid, uuid) to service_role;
grant execute on function public.close_vendor_job_once(uuid, uuid) to service_role;
grant execute on function public.close_vendor_job_for_callback(uuid) to service_role;
grant execute on function public.claim_vendor_notification_attempt(uuid, uuid, uuid) to service_role;
grant execute on function public.persist_vendor_message_sid(uuid, uuid, text, text) to service_role;
grant execute on function public.mark_vendor_job_reconciliation_required(uuid, uuid) to service_role;
grant execute on function public.apply_twilio_vendor_callback(text, text) to service_role;
grant execute on function public.record_manual_vendor_contact(uuid, uuid, text) to service_role;
grant execute on function public.update_ticket_staff_status(uuid, uuid, text, text) to service_role;
grant execute on function public.escalate_ticket_emergency(uuid, uuid) to service_role;

revoke all on function public.is_legacy_staff() from public, anon;
revoke all on function public.is_legacy_admin() from public, anon;
grant execute on function public.is_legacy_staff() to authenticated, service_role;
grant execute on function public.is_legacy_admin() to authenticated, service_role;

drop policy if exists "staff read profiles" on profiles;
create policy "staff read profiles" on profiles for select using (public.is_legacy_staff());

drop policy if exists "admin write profiles" on profiles;
create policy "admin write profiles" on profiles for all using (public.is_legacy_admin()) with check (public.is_legacy_admin());

drop policy if exists "staff read tickets" on maintenance_tickets;
create policy "staff read tickets" on maintenance_tickets for select using (public.is_legacy_staff());

drop policy if exists "staff write tickets" on maintenance_tickets;
drop policy if exists "staff update tickets" on maintenance_tickets;

drop policy if exists "staff read vendors" on vendors;
create policy "staff read vendors" on vendors for select using (public.is_legacy_staff());

drop policy if exists "staff write vendors" on vendors;

drop policy if exists "staff read vendor jobs" on vendor_jobs;
create policy "staff read vendor jobs" on vendor_jobs for select using (public.is_legacy_staff());

drop policy if exists "staff write vendor jobs" on vendor_jobs;

drop policy if exists "staff read ticket updates" on ticket_updates;
create policy "staff read ticket updates" on ticket_updates for select using (public.is_legacy_staff());

drop policy if exists "staff write ticket updates" on ticket_updates;

drop policy if exists "staff read operations" on operations_feed;
create policy "staff read operations" on operations_feed for select using (public.is_legacy_staff());

drop policy if exists "staff write operations" on operations_feed;

drop policy if exists "staff read notifications" on notifications;
create policy "staff read notifications" on notifications for select using (public.is_legacy_staff());

drop policy if exists "staff write notifications" on notifications;

drop policy if exists "staff read client requests" on client_requests;
create policy "staff read client requests" on client_requests for select using (public.is_legacy_staff());

drop policy if exists "staff write client requests" on client_requests;

drop policy if exists "admin command memory" on command_memory;
create policy "admin command memory" on command_memory for all using (public.is_legacy_admin()) with check (public.is_legacy_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legacy-documents',
  'legacy-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff read private documents" on storage.objects;
create policy "staff read private documents" on storage.objects
  for select using (bucket_id = 'legacy-documents' and public.is_legacy_staff());

drop policy if exists "staff upload private documents" on storage.objects;
-- Document uploads are validated and written only through protected server API routes.
-- Do not recreate a direct authenticated storage upload policy here.
