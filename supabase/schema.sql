create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id text,
  owner_id uuid,
  source text not null,
  source_id text not null,
  source_db_id text,
  title text,
  content text not null,
  chunk_index int not null,
  embedding vector(1536) not null,
  url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists documents_embedding_idx on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists documents_source_idx on documents (source);
create index if not exists documents_source_id_idx on documents (source_id);
create index if not exists documents_source_db_id_idx on documents (source_db_id);
create index if not exists documents_tenant_id_idx on documents (tenant_id);

alter table documents add column if not exists tenant_id text;
alter table documents add column if not exists owner_id uuid;
alter table documents add column if not exists source_db_id text;

create table if not exists document_sources (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_db_id text not null,
  tenant_id text not null,
  owner_id uuid,
  title text,
  is_searchable boolean not null default true,
  created_at timestamptz default now(),
  unique (source, source_db_id, tenant_id)
);

create index if not exists document_sources_tenant_id_idx on document_sources (tenant_id);
create index if not exists document_sources_source_idx on document_sources (source, source_db_id);

create or replace function current_tenant_id()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() ->> 'tenant_id',
    auth.jwt() -> 'app_metadata' ->> 'tenant_id',
    auth.jwt() -> 'user_metadata' ->> 'tenant_id'
  );
$$;

create or replace function is_tenant_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean,
    (auth.jwt() ->> 'is_admin')::boolean,
    false
  );
$$;

create or replace function match_documents(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  source text,
  source_id text,
  title text,
  content text,
  chunk_index int,
  url text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.source,
    documents.source_id,
    documents.title,
    documents.content,
    documents.chunk_index,
    documents.url,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;

alter table documents enable row level security;
alter table document_sources enable row level security;

drop policy if exists "documents_select_tenant" on documents;
create policy "documents_select_tenant"
on documents
for select
using (
  tenant_id = current_tenant_id()
  and exists (
    select 1
    from document_sources
    where document_sources.source = documents.source
      and document_sources.source_db_id = documents.source_db_id
      and document_sources.tenant_id = documents.tenant_id
      and (
        document_sources.is_searchable
        or is_tenant_admin()
      )
  )
);

drop policy if exists "documents_insert_tenant" on documents;
create policy "documents_insert_tenant"
on documents
for insert
with check (tenant_id = current_tenant_id());

drop policy if exists "documents_update_tenant" on documents;
create policy "documents_update_tenant"
on documents
for update
using (tenant_id = current_tenant_id())
with check (tenant_id = current_tenant_id());

drop policy if exists "document_sources_select_tenant" on document_sources;
create policy "document_sources_select_tenant"
on document_sources
for select
using (tenant_id = current_tenant_id());

drop policy if exists "document_sources_insert_admin" on document_sources;
create policy "document_sources_insert_admin"
on document_sources
for insert
with check (tenant_id = current_tenant_id() and is_tenant_admin());

drop policy if exists "document_sources_update_admin" on document_sources;
create policy "document_sources_update_admin"
on document_sources
for update
using (tenant_id = current_tenant_id() and is_tenant_admin())
with check (tenant_id = current_tenant_id() and is_tenant_admin());

drop policy if exists "document_sources_delete_admin" on document_sources;
create policy "document_sources_delete_admin"
on document_sources
for delete
using (tenant_id = current_tenant_id() and is_tenant_admin());

create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid,
  user_id uuid,
  user_message text not null,
  assistant_message text not null,
  model text,
  finish_reason text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists chat_logs_chat_id_idx on chat_logs (chat_id);
create index if not exists chat_logs_user_id_idx on chat_logs (user_id);
create index if not exists chat_sessions_updated_at_idx on chat_sessions (updated_at);
create index if not exists chat_sessions_user_id_idx on chat_sessions (user_id);

alter table chat_sessions enable row level security;
alter table chat_logs enable row level security;

drop policy if exists "chat_sessions_select_own" on chat_sessions;
create policy "chat_sessions_select_own"
on chat_sessions
for select
using (user_id = auth.uid());

drop policy if exists "chat_sessions_insert_own" on chat_sessions;
create policy "chat_sessions_insert_own"
on chat_sessions
for insert
with check (user_id = auth.uid());

drop policy if exists "chat_sessions_update_own" on chat_sessions;
create policy "chat_sessions_update_own"
on chat_sessions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "chat_logs_select_own" on chat_logs;
create policy "chat_logs_select_own"
on chat_logs
for select
using (user_id = auth.uid());

drop policy if exists "chat_logs_insert_own" on chat_logs;
create policy "chat_logs_insert_own"
on chat_logs
for insert
with check (user_id = auth.uid());
