# Local Validation Steps

This document describes how to validate the full application flow in a local
environment.

## Prerequisites
- Node.js / npm installed
- Supabase CLI available
- Local Supabase can be started (Rancher Desktop users have handled it separately)

## Steps

1. Start local Supabase
   ```bash
   supabase start
   ```
   - Note the `Project URL` and `Publishable/Secret` values from the output.

2. Apply the schema
   - Run `supabase/schema.sql` in Studio  
     Studio: `http://127.0.0.1:54323`
   - Or use `psql`
     ```bash
     psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
       -f supabase/schema.sql
     ```

3. Set environment variables
   ```bash
   cp .env.example .env.local
   ```
   - Replace `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` with local Supabase values.
   - `OPENAI_API_KEY` is required.
  - If you ingest Notion, also set `NOTION_API_KEY`, `NOTION_DATABASE_ID`, and required `NOTION_TENANT_ID` (optional `NOTION_OWNER_ID` for owner attribution).

4. Install dependencies and run
   ```bash
   npm install
   npm run dev
   ```

## Validation checklist

1. Open the app
   - http://localhost:3000

2. Authentication
   - For magic link: open Mailpit  
     Mailpit: http://127.0.0.1:54324
   - For password auth: sign in as usual

3. Chat
   - Create a conversation and confirm a response is returned

4. RAG (optional)
   - If Notion is ingested, verify that queries with known keywords return results
   - If not ingested, run `npm run ingest:notion`
