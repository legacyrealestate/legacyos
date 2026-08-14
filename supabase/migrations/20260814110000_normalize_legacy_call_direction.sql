-- Historical ElevenLabs conversations were imported before direction was recorded.
-- These are received calls, so mark them inbound without altering explicit outbound data.
update public.maintenance_tickets
set direction = 'inbound'
where direction is null
  and (
    provider is not null
    or provider_conversation_id is not null
    or transcript is not null
    or call_started_at is not null
  );

create index if not exists maintenance_direction_idx
  on public.maintenance_tickets(direction, created_at desc);
