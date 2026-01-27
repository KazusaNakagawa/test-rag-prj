# RLS API Test (curl)

Use these curl examples to verify RLS behavior via the Supabase REST API.

## Prerequisites

Set environment variables (replace with your local or hosted values):

```bash
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_ANON_KEY="sb_publishable_..."
export USER_JWT="eyJhbGciOi..."
```

`USER_JWT` must be the access token for the user you want to test.

## 1) Read documents with RLS

```bash
curl -sS "$SUPABASE_URL/rest/v1/documents?select=tenant_id,source_id,title&limit=5" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT"
```

Expected:
- Only rows for the user’s `tenant_id` are returned.
- Rows require `document_sources.is_searchable = true` unless user is admin.

## 2) Read document_sources with RLS

```bash
curl -sS "$SUPABASE_URL/rest/v1/document_sources?select=tenant_id,source_db_id,is_searchable&limit=5" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT"
```

Expected:
- Only rows for the user’s `tenant_id` are returned.

## 3) Test RPC (match_documents)

```bash
curl -sS "$SUPABASE_URL/rest/v1/rpc/match_documents" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "query_embedding": [0, 0, 0],
    "match_count": 3
  }'
```

Notes:
- Replace `query_embedding` with a real 1536-length vector.
- If you use a short vector, Supabase will return a dimension error.

## 4) Negative test (no JWT)

```bash
curl -sS "$SUPABASE_URL/rest/v1/documents?select=tenant_id,source_id,title&limit=5" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

Expected:
- No rows or an authorization error, depending on your policy setup.
