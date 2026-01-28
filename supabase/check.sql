-- 1) RLS enabled status for target tables.
select relname, relrowsecurity
from pg_class
where relname in ('documents', 'document_sources');

-- 2) RLS policies defined on the target tables (Supabase uses policyname).
select policyname, cmd, roles, qual, with_check
from pg_policies
where tablename in ('documents', 'document_sources')
order by tablename, policyname;

-- 3) Column definitions for the target tables.
select table_name, column_name, data_type
from information_schema.columns
where table_name in ('documents', 'document_sources')
order by table_name, ordinal_position;
