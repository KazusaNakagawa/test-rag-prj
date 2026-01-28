# Multi-tenant Setup Steps

This document summarizes the setup steps for the multi-tenant support implemented in this project.

## 1. Apply the DB schema

Apply `supabase/schema.sql` to Supabase (hosted or local).

Steps:
1) Open Supabase Studio → SQL Editor  
2) Paste and run `supabase/schema.sql`  
3) Confirm the `match_documents` function exists

Optional check:
```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'match_documents';
```

## 2. Configure environment variables

Set the following in `.env.local`.

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NOTION_API_KEY=...
NOTION_DATABASE_ID=...
NOTION_TENANT_ID=tenant_dev
NOTION_OWNER_ID=
```

`NOTION_OWNER_ID` must be a UUID. Leave it empty if not used.

## 3. Ingest Notion data

```
npm run ingest:notion -- .env.local
```

Optional check:
```sql
select tenant_id, count(*)
from documents
group by tenant_id;
```

## 4. Add tenant_id to JWT

### Method A: Set via UI (hosted/local)
Authentication → Users → target user → add to `app_metadata`:
```json
{
  "tenant_id": "tenant_dev",
  "is_admin": false
}
```
Save → Sign out → Sign in (token refresh required)

If the UI is not available, use Method B.

### Method B: Update via SQL Editor (reliable)
#### Hosted/Production (update `app_metadata`)
```sql
update auth.users
set app_metadata = coalesce(app_metadata, '{}'::jsonb) || jsonb_build_object(
  'tenant_id', 'tenant_dev',
  'is_admin', false
)
where id = 'USER_UUID';
```

#### Local (update `raw_app_meta_data`)
```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('tenant_id', 'tenant_dev', 'is_admin', false)
where id = 'USER_UUID';
```

Sign out and sign in again after running the update.

## 5. Verify RLS and tables

Run `supabase/check.sql` and confirm:
- RLS is enabled (`relrowsecurity = true`)
- Policies exist
- Required columns exist

## 6. Functional testing

Run `supabase/test-access.sql` and confirm:
- Tenant scoping behavior
- `is_searchable` behavior
- Admin override behavior

## Notes

- Document search requires `tenant_id` plus `document_sources.is_searchable`.
- If results are empty, the most common cause is missing `tenant_id` in the JWT.
