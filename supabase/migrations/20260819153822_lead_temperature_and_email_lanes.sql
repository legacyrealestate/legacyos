-- Persist a transparent, deterministic qualification score for leasing leads.
-- The score is operational context, not a prediction of a signed lease.
alter table public.email_leads
  add column if not exists lead_temperature text not null default 'Cold',
  add column if not exists lead_score integer not null default 0,
  add column if not exists lead_score_reasons text[] not null default '{}';

alter table public.email_leads
  drop constraint if exists email_leads_lead_temperature_check;
alter table public.email_leads
  add constraint email_leads_lead_temperature_check
  check (lead_temperature in ('Hot', 'Warm', 'Cold'));

alter table public.email_leads
  drop constraint if exists email_leads_lead_score_check;
alter table public.email_leads
  add constraint email_leads_lead_score_check
  check (lead_score between 0 and 100);

create index if not exists email_leads_temperature_updated_idx
  on public.email_leads(lead_temperature, updated_at desc);
