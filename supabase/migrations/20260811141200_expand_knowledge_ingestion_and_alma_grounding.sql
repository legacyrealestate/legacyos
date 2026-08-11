-- Expand private Knowledge Drop ingestion. Classification is advisory only;
-- it never creates or mutates CRM records without a staff review action.

alter table public.knowledge_sources
  add column if not exists detected_category text,
  add column if not exists detected_topics text[] not null default '{}',
  add column if not exists suggested_destination text,
  add column if not exists classification_confidence numeric,
  add column if not exists classification_status text not null default 'pending'
    check (classification_status in ('pending', 'detected', 'staff_selected', 'failed')),
  add column if not exists last_classified_at timestamptz;

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
where id = 'legacy-knowledge';

create index if not exists knowledge_sources_detected_category_idx
  on public.knowledge_sources(detected_category, created_at desc);

notify pgrst, 'reload schema';
