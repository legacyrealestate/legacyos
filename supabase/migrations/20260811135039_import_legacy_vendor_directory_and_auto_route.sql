-- Real Legacy contractor directory import and internal call-to-vendor routing.
-- Imported from "Copy of List of Contractors (1).xlsx" on 2026-08-11.
-- This intentionally excludes tax IDs, 1099 fields, private addresses, and all outbound sending.

alter table public.vendors add column if not exists alternate_email text;
alter table public.vendors add column if not exists coverage_trades text[] not null default '{}';
alter table public.vendors add column if not exists dispatch_order integer not null default 1000;
alter table public.vendors add column if not exists import_source text;

with imported (
  name, trade, coverage_trades, phone, email, alternate_email, dispatch_keywords, dispatch_order
) as (
  values
    ('Kevin Ray Thomas', 'Plumbing & Repairs', array['Plumbing & Repairs','HVAC','Mold Remediation'], '+16155794526', 'kt6238@aol.com', null, array['plumbing','pipe','leak','drain','toilet','faucet','water heater','repair','hvac','air conditioner','heat','cooling','mold','mildew'], 10),
    ('David Garcia', 'Plumbing & Repairs', array['Plumbing & Repairs','Rent Ready','Mold Remediation'], '+16156057652', 'david.garcia5552@gmail.com', null, array['plumbing','pipe','leak','drain','toilet','faucet','repair','rent ready','turnover','make ready','mold','mildew'], 20),
    ('Brian Schandel', 'Plumbing & Repairs', array['Plumbing & Repairs','Rent Ready'], '+12707992909', 'brian.schandel66@gmail.com', 'carterdawson11@gmail.com', array['plumbing','pipe','leak','drain','toilet','faucet','repair','rent ready','turnover','make ready'], 30),
    ('Tim Reese', 'Plumbing & Repairs', array['Plumbing & Repairs'], '+19316223229', 'timr59465@gmail.com', null, array['plumbing','pipe','leak','drain','toilet','faucet','repair'], 40),
    ('Precision Plumbing', 'Plumbing & Repairs', array['Plumbing & Repairs'], '+16158768691', 'workticket@precisionplumbingcompany.com', 'estimates@precisionplumbingcompany.com', array['plumbing','pipe','leak','drain','toilet','faucet','water heater','sewage'], 50),
    ('Higher Standard Refrigeration Heating & Air', 'HVAC', array['HVAC'], '+16155689329', 'higherstandardheatandair@gmail.com', null, array['hvac','air conditioner','ac','heat','heating','cooling','thermostat','furnace','refrigeration'], 60),
    ('Lewis Heating & Cooling Inc.', 'HVAC', array['HVAC'], '+16158612392', 'lewisair1971@gmail.com', null, array['hvac','air conditioner','ac','heat','heating','cooling','thermostat','furnace'], 70),
    ('Justin Dean Coates', 'Rent Ready', array['Rent Ready','Painting'], '+16154981603', 'sgtcoates615@gmail.com', null, array['rent ready','turnover','make ready','paint','painting','repaint','touch up'], 80),
    ('Brian Coates', 'Rent Ready', array['Rent Ready','Painting','Paving & Driveway'], '+16156069441', 'weturelure@gmail.com', null, array['rent ready','turnover','make ready','paint','painting','driveway','paving','asphalt'], 90),
    ('Ronald Claybrooks', 'Rent Ready', array['Rent Ready','Painting'], '+16154197384', null, null, array['rent ready','turnover','make ready','paint','painting','repaint'], 100),
    ('Noe Flores Vergara', 'Tree Service', array['Tree Service','Painting','Animal Removal'], '+16156894927', 'noeflores86@yahoo.com', 'anna.caballero2003@yahoo.com', array['tree','trees','branch','limb','stump','paint','painting','animal','wildlife'], 110),
    ('Kaily''s Tree Service', 'Tree Service', array['Tree Service'], '+16154961542', 'kailystree@gmail.com', null, array['tree','trees','branch','limb','stump'], 120),
    ('Robby Ragan', 'Tree Service', array['Tree Service','Paving & Driveway'], '+16153359936', 'raganoutdoorservice@gmail.com', null, array['tree','trees','branch','limb','stump','driveway','paving','asphalt'], 130),
    ('Wilber Eduardo Dzib', 'Tree Service', array['Tree Service','Trash Out'], '+16155216652', 'aduardo@att.net', null, array['tree','trees','branch','limb','stump','trash','trash out','haul away','debris'], 140),
    ('Aurelio Torres', 'Tree Service', array['Tree Service'], '+16155136730', 'aureliotorres1985@gmail.com', null, array['tree','trees','branch','limb','stump'], 150),
    ('Outlaw Exterminating LLC', 'Pest Control', array['Pest Control'], '+16159060479', 'outlawexterminating2025@outlook.com', null, array['pest','pests','roaches','roach','bed bug','bed bugs','mice','mouse','rats','rat','exterminator'], 160),
    ('Maria Alvarado', 'Painting', array['Painting','Cleaning','Mold Remediation'], '+16154031646', 'twinsServices.5@gmail.com', 'mariaalvarado_5@yahoo.com', array['paint','painting','repaint','touch up','clean','cleaning','mold','mildew'], 170),
    ('Ochoa Painting', 'Painting', array['Painting'], '+16154978773', null, null, array['paint','painting','repaint','touch up'], 180),
    ('Heritage Construction Group LLC', 'Painting', array['Painting'], '+16156481160', 'jordan@phillipshomebuilders.com', null, array['paint','painting','repaint','touch up'], 190),
    ('Anna Caballero', 'Cleaning', array['Cleaning'], null, null, null, array['clean','cleaning','deep clean','turnover clean'], 200),
    ('South Carpet Cleaning', 'Cleaning', array['Cleaning'], '+16155961820', 'southcleaning@gmail.com', null, array['clean','cleaning','carpet','carpet cleaning'], 210),
    ('Sweeps & Ladders LLC', 'Cleaning', array['Cleaning'], '+16157917457', 'office@sweepsandladders.com', null, array['clean','cleaning','sweep','chimney','ladder'], 220),
    ('Cliff Rychen', 'Electrical', array['Electrical'], '+16153000257', 'cliffrychen@gmail.com', null, array['electrical','electric','outlet','breaker','panel','wire','wiring','power','light','lighting'], 230),
    ('Gustavo Cepeda', 'Flooring', array['Flooring'], '+16155681453', null, null, array['floor','flooring','vinyl','carpet','tile','laminate','hardwood'], 240),
    ('Jesus Cordero', 'Flooring', array['Flooring'], '+16157391074', 'bestflooring30@gmail.com', null, array['floor','flooring','vinyl','carpet','tile','laminate','hardwood'], 250),
    ('Natural Mold Solutions LLC.', 'Mold Remediation', array['Mold Remediation'], '+16159748953', 'michael.biscotto@gmail.com', null, array['mold','mildew','moisture','remediation'], 260),
    ('Rocky Top Paving', 'Paving & Driveway', array['Paving & Driveway'], '+16159777283', 'rockytopasphalt@yahoo.com', null, array['driveway','paving','asphalt','pothole','concrete'], 270),
    ('Adrian W Gonzalez Garcia', 'Paving & Driveway', array['Paving & Driveway'], '+16155793020', 'pattonico5715@gmail.com', null, array['driveway','paving','asphalt','masonry','brick','concrete'], 280),
    ('Greer Septic Service', 'Septic', array['Septic'], '+16154051812', 'ron4130@aol.com', null, array['septic','sewer','sewage','backup','drain field'], 290),
    ('Arturo Gomez', 'Roofing', array['Roofing'], null, 'arturogomez@myyahoo.com', 'artgomezrayo@gmail.com', array['roof','roofing','shingle','leak','ceiling leak'], 300),
    ('Tonya Gordon', 'Trash Out', array['Trash Out'], null, null, null, array['trash','trash out','haul away','debris'], 310)
), updated as (
  update public.vendors vendor
  set trade = imported.trade,
      coverage_trades = imported.coverage_trades,
      phone = imported.phone,
      email = imported.email,
      alternate_email = imported.alternate_email,
      dispatch_keywords = imported.dispatch_keywords,
      dispatch_order = imported.dispatch_order,
      priority = 'Standard',
      emergency_available = false,
      active = true,
      import_source = 'Legacy contractor directory spreadsheet 2026-08-11',
      updated_at = pg_catalog.now()
  from imported
  where lower(vendor.name) = lower(imported.name)
  returning vendor.id
)
insert into public.vendors (
  name, trade, coverage_trades, phone, email, alternate_email, dispatch_keywords,
  dispatch_order, priority, emergency_available, active, import_source
)
select
  imported.name, imported.trade, imported.coverage_trades, imported.phone, imported.email,
  imported.alternate_email, imported.dispatch_keywords, imported.dispatch_order,
  'Standard', false, true, 'Legacy contractor directory spreadsheet 2026-08-11'
from imported
where not exists (
  select 1 from public.vendors vendor where lower(vendor.name) = lower(imported.name)
);

create unique index if not exists one_open_vendor_recommendation_per_ticket
on public.vendor_jobs(ticket_id)
where status = 'Recommended' and closed_at is null;

create unique index if not exists ticket_updates_auto_vendor_route_idx
on public.ticket_updates(ticket_id, type)
where type in ('automatic_vendor_route', 'automatic_vendor_route_unmatched', 'automatic_vendor_route_held');

create unique index if not exists operations_feed_auto_vendor_route_idx
on public.operations_feed(related_ticket_id, type)
where related_ticket_id is not null and type = 'vendor_recommended';

create unique index if not exists notifications_auto_vendor_route_idx
on public.notifications(related_ticket_id, type)
where related_ticket_id is not null and type = 'vendor_route' and acknowledged_at is null;

create or replace function public.route_ticket_to_vendor(
  ticket_id_input uuid,
  route_source_input text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, auth
as $$
declare
  ticket_row public.maintenance_tickets%rowtype;
  candidate record;
  ticket_text text;
begin
  select * into ticket_row
  from public.maintenance_tickets
  where id = ticket_id_input
  for update;

  if not found then
    raise exception 'Maintenance ticket not found';
  end if;

  if ticket_row.urgency = 'Emergency' or ticket_row.classification = 'emergency' then
    update public.ticket_updates
    set title = 'Automatic vendor routing held',
        description = 'Emergency intake requires human review. No vendor was selected or contacted automatically.',
        updated_at = pg_catalog.now()
    where ticket_id = ticket_id_input and type = 'automatic_vendor_route_held';
    if not found then
      insert into public.ticket_updates (ticket_id, type, title, description)
      values (
        ticket_id_input,
        'automatic_vendor_route_held',
        'Automatic vendor routing held',
        'Emergency intake requires human review. No vendor was selected or contacted automatically.'
      );
    end if;

    return jsonb_build_object('status', 'held_for_emergency_review');
  end if;

  if exists (
    select 1 from public.vendor_jobs
    where ticket_id = ticket_id_input
      and closed_at is null
      and status in ('Approved', 'Notification Queued', 'Sent', 'Delivered', 'Manually Contacted', 'Reconciliation Required')
  ) then
    return jsonb_build_object('status', 'already_routed');
  end if;

  ticket_text := lower(concat_ws(' ', ticket_row.issue_category, ticket_row.issue, ticket_row.ai_summary, ticket_row.transcript));

  select vendor.*, matched.match_count * 10 as routing_score
  into candidate
  from public.vendors vendor
  cross join lateral (
    select count(*)::integer as match_count
    from unnest(vendor.dispatch_keywords) as keyword
    where ticket_text like '%' || lower(keyword) || '%'
  ) matched
  where vendor.active = true
    and (vendor.phone is not null or vendor.email is not null)
    and matched.match_count > 0
  order by
    matched.match_count desc,
    case when vendor.priority = 'Preferred' then 1 else 0 end desc,
    vendor.dispatch_order asc,
    vendor.name asc
  limit 1;

  if not found then
    update public.ticket_updates
    set title = 'No contactable vendor match',
        description = 'LegacyOS created the maintenance ticket but found no matching vendor with a phone number or email. Staff review is required.',
        updated_at = pg_catalog.now()
    where ticket_id = ticket_id_input and type = 'automatic_vendor_route_unmatched';
    if not found then
      insert into public.ticket_updates (ticket_id, type, title, description)
      values (
        ticket_id_input,
        'automatic_vendor_route_unmatched',
        'No contactable vendor match',
        'LegacyOS created the maintenance ticket but found no matching vendor with a phone number or email. Staff review is required.'
      );
    end if;

    return jsonb_build_object('status', 'no_contactable_match');
  end if;

  insert into public.vendor_jobs (
    ticket_id, vendor_id, vendor_name, issue, tenant_name, urgency, status, notification_status
  )
  values (
    ticket_id_input, candidate.id, candidate.name, ticket_row.issue, ticket_row.tenant_name,
    ticket_row.urgency, 'Recommended', 'Pending Approval'
  )
  on conflict (ticket_id) where status = 'Recommended' and closed_at is null do update
    set vendor_id = excluded.vendor_id,
        vendor_name = excluded.vendor_name,
        issue = excluded.issue,
        tenant_name = excluded.tenant_name,
        urgency = excluded.urgency,
        updated_at = pg_catalog.now();

  update public.maintenance_tickets
  set assigned_vendor_id = candidate.id,
      assigned_vendor_name = candidate.name,
      assigned_to_name = candidate.name,
      assigned_to_phone = candidate.phone,
      assigned_to_email = candidate.email,
      dispatch_status = 'Recommended',
      status = 'Vendor Recommended',
      updated_at = pg_catalog.now()
  where id = ticket_id_input
    and status not in ('Resolved', 'Closed', 'Manually Contacted');

  update public.ticket_updates
  set title = 'Vendor recommended for staff approval',
      description = candidate.name || ' matched the imported Legacy contractor directory. Source: ' || coalesce(route_source_input, 'system') || '. No vendor communication was sent.',
      updated_at = pg_catalog.now()
  where ticket_id = ticket_id_input and type = 'automatic_vendor_route';
  if not found then
    insert into public.ticket_updates (ticket_id, type, title, description)
    values (
      ticket_id_input,
      'automatic_vendor_route',
      'Vendor recommended for staff approval',
      candidate.name || ' matched the imported Legacy contractor directory. Source: ' || coalesce(route_source_input, 'system') || '. No vendor communication was sent.'
    );
  end if;

  update public.operations_feed
  set title = 'Vendor recommendation ready: ' || candidate.name,
      description = 'Maintenance ticket was matched to a contactable vendor. Staff approval is required before dispatch.'
  where related_ticket_id = ticket_id_input and type = 'vendor_recommended';
  if not found then
    insert into public.operations_feed (type, title, description, related_ticket_id)
    values (
      'vendor_recommended',
      'Vendor recommendation ready: ' || candidate.name,
      'Maintenance ticket was matched to a contactable vendor. Staff approval is required before dispatch.',
      ticket_id_input
    );
  end if;

  update public.notifications
  set title = 'Vendor approval required',
      description = candidate.name || ' was recommended for a maintenance ticket. Review before any external contact.'
  where related_ticket_id = ticket_id_input and type = 'vendor_route' and acknowledged_at is null;
  if not found then
    insert into public.notifications (title, description, type, related_ticket_id)
    values (
      'Vendor approval required',
      candidate.name || ' was recommended for a maintenance ticket. Review before any external contact.',
      'vendor_route',
      ticket_id_input
    );
  end if;

  return jsonb_build_object(
    'status', 'recommended',
    'vendorId', candidate.id,
    'vendorName', candidate.name
  );
end;
$$;

revoke all on function public.route_ticket_to_vendor(uuid, text) from public, anon, authenticated;
grant execute on function public.route_ticket_to_vendor(uuid, text) to service_role;

notify pgrst, 'reload schema';
