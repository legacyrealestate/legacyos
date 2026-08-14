-- Permit encrypted OAuth connections for Elevate alongside existing email providers.
-- The existing table remains server-write-only; its RLS and grants are unchanged.
alter table public.provider_connections drop constraint if exists provider_connections_provider_check;
alter table public.provider_connections add constraint provider_connections_provider_check
  check (provider in ('google', 'microsoft', 'elevate'));

notify pgrst, 'reload schema';
