-- Knowledge Drop / RAG. The Supabase CLI could not create this file in the
-- sandbox because its home directory is read-only; use this normal migration
-- filename when applying through the linked project.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'legacy-knowledge',
  'legacy-knowledge',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Policies',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  source_type text not null default 'upload' check (source_type in ('upload', 'document_import')),
  status text not null default 'queued' check (status in ('queued', 'indexing', 'ready', 'failed')),
  extracted_text_length integer not null default 0,
  last_error text,
  indexed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_sources_status_idx on public.knowledge_sources(status, updated_at desc);
create index if not exists knowledge_ingestion_jobs_source_idx on public.knowledge_ingestion_jobs(source_id, created_at desc);

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_ingestion_jobs enable row level security;

drop policy if exists "staff read knowledge sources" on public.knowledge_sources;
create policy "staff read knowledge sources" on public.knowledge_sources
  for select to authenticated using (public.is_legacy_staff());
drop policy if exists "staff read knowledge ingestion jobs" on public.knowledge_ingestion_jobs;
create policy "staff read knowledge ingestion jobs" on public.knowledge_ingestion_jobs
  for select to authenticated using (public.is_legacy_staff());

revoke all on public.knowledge_sources, public.knowledge_ingestion_jobs from anon, authenticated;
grant select on public.knowledge_sources, public.knowledge_ingestion_jobs to authenticated;

drop policy if exists "staff read private knowledge" on storage.objects;
create policy "staff read private knowledge" on storage.objects
  for select to authenticated using (bucket_id = 'legacy-knowledge' and public.is_legacy_staff());

-- PGlite used by the unit suite does not ship pgvector. Supabase does, so create
-- the vector-dependent objects only when the extension is available.
do $knowledge_setup$
begin
  if exists (select 1 from pg_available_extensions where name = 'vector') then
    execute 'create extension if not exists vector';
    execute $knowledge_sql$
      create table if not exists public.knowledge_chunks (
        id uuid primary key default gen_random_uuid(),
        source_id uuid not null references public.knowledge_sources(id) on delete cascade,
        chunk_index integer not null check (chunk_index >= 0),
        content text not null check (length(content) > 0),
        embedding vector(1536) not null,
        created_at timestamptz not null default now(),
        unique(source_id, chunk_index)
      );
      create index if not exists knowledge_chunks_source_idx on public.knowledge_chunks(source_id, chunk_index);
      create index if not exists knowledge_chunks_embedding_hnsw_idx on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);
      alter table public.knowledge_chunks enable row level security;
      revoke all on public.knowledge_chunks from anon, authenticated;
      grant select on public.knowledge_chunks to authenticated;
      drop policy if exists "staff read knowledge chunks" on public.knowledge_chunks;
      create policy "staff read knowledge chunks" on public.knowledge_chunks for select to authenticated using (public.is_legacy_staff());
    $knowledge_sql$;
    execute $knowledge_function$
      create or replace function public.match_knowledge_chunks(query_embedding vector(1536), match_count integer default 8)
      returns table (chunk_id uuid, source_id uuid, source_title text, original_filename text, category text, content text, similarity double precision)
      language sql stable security invoker
      as $match_function$
        select knowledge_chunks.id, knowledge_sources.id, knowledge_sources.title, knowledge_sources.original_filename,
          knowledge_sources.category, knowledge_chunks.content, 1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
        from public.knowledge_chunks
        join public.knowledge_sources on knowledge_sources.id = knowledge_chunks.source_id
        where knowledge_sources.status = 'ready'
        order by knowledge_chunks.embedding <=> query_embedding
        limit greatest(1, least(match_count, 12));
      $match_function$;
      revoke all on function public.match_knowledge_chunks(vector, integer) from public, anon;
      grant execute on function public.match_knowledge_chunks(vector, integer) to authenticated, service_role;
    $knowledge_function$;
  else
    raise notice 'pgvector is unavailable in this local test database; vector objects were skipped.';
  end if;
end
$knowledge_setup$;
