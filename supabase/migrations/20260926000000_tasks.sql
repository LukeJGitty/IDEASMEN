-- Follow-up tasks (Hippo task manager). Shared by all clinicians, like patients.
-- Tasks come from a finalised note's plan (source = 'note') or are added by hand.
-- No deletes: a task is completed or reopened so the history is kept.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  consultation_id uuid references public.consultations(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  details text check (details is null or char_length(details) <= 1000),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done')),
  source text not null default 'manual' check (source in ('manual', 'note')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((status = 'done') = (completed_at is not null))
);
create index tasks_open_due_idx on public.tasks (status, due_at);
create index tasks_patient_idx on public.tasks (patient_id, status);
create index tasks_assignee_idx on public.tasks (assigned_to, status);

-- The database, not the client, records who completed a task and when.
create function public.stamp_task() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'done' then
      raise exception 'New tasks must be open' using errcode = 'check_violation';
    end if;
    new.completed_by = null;
    new.completed_at = null;
  elsif new.status is distinct from old.status then
    if new.status = 'done' then
      new.completed_by = auth.uid();
      new.completed_at = now();
    else
      new.completed_by = null;
      new.completed_at = null;
    end if;
  else
    new.completed_by = old.completed_by;
    new.completed_at = old.completed_at;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
create trigger tasks_stamp before insert or update on public.tasks
  for each row execute function public.stamp_task();

alter table public.tasks enable row level security;
revoke all on public.tasks from anon, authenticated;
grant select on public.tasks to authenticated;
grant insert (patient_id, consultation_id, title, details, due_at, source, assigned_to)
  on public.tasks to authenticated;
grant update (title, details, due_at, status, assigned_to) on public.tasks to authenticated;
create policy "Clinicians read tasks" on public.tasks for select to authenticated
  using ((select public.is_clinician()));
create policy "Clinicians create tasks" on public.tasks for insert to authenticated
  with check ((select public.is_clinician()) and created_by = (select auth.uid()));
create policy "Clinicians update tasks" on public.tasks for update to authenticated
  using ((select public.is_clinician())) with check ((select public.is_clinician()));
