-- Restore the Phone CRM relationship and force PostgREST to rebuild its cache.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ticket_updates'::regclass
      and confrelid = 'public.maintenance_tickets'::regclass
      and contype = 'f'
  ) then
    alter table public.ticket_updates add constraint ticket_updates_ticket_id_fkey
      foreign key (ticket_id) references public.maintenance_tickets(id) on delete cascade;
  end if;
end $$;
create index if not exists ticket_updates_ticket_created_idx on public.ticket_updates(ticket_id, created_at asc);
notify pgrst, 'reload schema';
