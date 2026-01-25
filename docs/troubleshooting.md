# Troubleshooting

This note summarizes the issues that blocked progress during setup and how they
were resolved.

## Supabase schema apply

Symptoms:
- `column "chat_id" does not exist`
- `create table if not exists` did not update existing schema

Fix:
- Use `alter table` for existing tables.
- Example:
  ```sql
  alter table chat_logs add column if not exists chat_id uuid;
  ```

## dotenv not loading .env.local in scripts

Symptoms:
- `Missing environment variable: NOTION_API_KEY`

Cause:
- `dotenv` in CLI scripts loads `.env` by default, not `.env.local`.

Fix:
- `DOTENV_CONFIG_PATH=.env.local npm run ingest:notion`
- Or copy `.env.local` to `.env`.

## Notion SDK v5 change

Symptoms:
- `TypeError: notion.databases.query is not a function`

Cause:
- Notion SDK v5 uses `dataSources.query` for databases.

Fix:
- Use `dataSources.query` with a data source id derived from the database.
- `scripts/ingest-notion.ts` implements a fallback for this.

## RAG results felt unrelated

Symptoms:
- Retrieved documents did not mention obvious keywords (e.g., "AWS").

Fix:
- Add keyword-based search alongside vector search and rerank by keyword hits.
- Implemented in `src/lib/rag.ts`.

## chat_id type mismatch

Symptoms:
- `/api/chat/logs?chat_id=...` returns 500
- `invalid input syntax for type uuid`

Cause:
- Client generated `chat_...` strings instead of UUIDs.

Fix:
- Generate UUID v4 in the browser using `crypto.getRandomValues`.

## Next dev lock / port conflicts

Symptoms:
- `Unable to acquire lock at .next/dev/lock`
- Port 3000 in use by old process

Fix:
- Kill stale Next.js processes, then restart `npm run dev`.

## Supabase Auth rate limits

Symptoms:
- `email rate limit exceeded`
- Magic link does not send

Cause:
- Free tier has a low email send limit (e.g., 2 per hour).

Fix:
- Wait for reset, use a different email, or configure SMTP.
- Audit logs: Supabase Dashboard -> Authentication -> Audit Logs.

## Auth / RLS migration

Symptoms:
- Requests fail after enabling RLS without proper auth

Fix:
- Use Supabase Auth with anon key + JWT on API requests.
- Ensure tables have `user_id` and policies for `auth.uid()`.

