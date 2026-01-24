create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text not null,
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
