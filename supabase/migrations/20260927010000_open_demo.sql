-- Open demo mode: when switched on, anyone who signs in with any email becomes a
-- clinician named "Dr Demo" (people added by name keep their names). Off by default,
-- so local development and CI keep the "approved clinicians only" rule. Only the
-- service role can switch it (pnpm db:open-demo-hosted on|off).
create table public.demo_settings (
  id boolean primary key default true check (id),
  open_signup boolean not null default false,
  demo_name text not null default 'Dr Demo' check (char_length(btrim(demo_name)) between 1 and 120)
);
insert into public.demo_settings (id) values (true);
alter table public.demo_settings enable row level security;
revoke all on public.demo_settings from anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.demo_settings;
  given text := left(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), 120);
begin
  select * into settings from public.demo_settings where id;
  if coalesce(settings.open_signup, false) then
    insert into public.profiles (id, full_name, is_clinician)
    values (new.id, case when given = '' then settings.demo_name else given end, true);
  else
    insert into public.profiles (id, full_name) values (new.id, given);
  end if;
  return new;
end;
$$;

-- Switching on also lets in anyone who already signed up and was refused; switching
-- off removes access from the "Dr Demo" accounts only, never from named clinicians.
create function public.set_open_demo(enabled boolean) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  settings public.demo_settings;
  changed integer;
begin
  update public.demo_settings set open_signup = enabled where id returning * into settings;
  if enabled then
    update public.profiles
      set is_clinician = true,
          full_name = case when btrim(full_name) = '' then settings.demo_name else full_name end
      where not is_clinician;
  else
    update public.profiles set is_clinician = false
      where is_clinician and full_name = settings.demo_name;
  end if;
  get diagnostics changed = row_count;
  return changed;
end;
$$;
revoke execute on function public.set_open_demo(boolean) from public, anon, authenticated;
grant execute on function public.set_open_demo(boolean) to service_role;
