-- Live dashboard, task and handover updates. Supabase Realtime only sends a change to
-- a signed-in browser if that user's RLS policies let them read the row, so this adds
-- no new access. The guard keeps plain Postgres (without the publication) working.
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['tasks', 'consultations', 'roster_shifts'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
