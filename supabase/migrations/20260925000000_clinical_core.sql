-- Clinical core for the MVP. All authorised clinicians share all patients;
-- being signed in is not enough: profiles.is_clinician must be true, and only
-- an administrator (Studio, service role or scripts/seed-demo-users.ts) can set it.

-- Profiles --------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  is_clinician boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill accounts that existed before this migration.
insert into public.profiles (id) select id from auth.users on conflict do nothing;

-- The single RLS predicate for clinical data. Security definer so policies can
-- read profiles without recursing through profiles' own policies.
create function public.is_clinician() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.is_clinician from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;
revoke execute on function public.is_clinician() from public, anon;
grant execute on function public.is_clinician() to authenticated;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
create policy "Read own or clinician profiles" on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select public.is_clinician()));
create policy "Update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Patients --------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  date_of_birth date not null check (date_of_birth >= '1900-01-01'),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index patients_last_first_idx on public.patients (lower(last_name), lower(first_name));
create trigger patients_updated_at before update on public.patients
  for each row execute function public.set_updated_at();

alter table public.patients enable row level security;
revoke all on public.patients from anon, authenticated;
grant select on public.patients to authenticated;
grant insert (first_name, last_name, date_of_birth, email, phone) on public.patients to authenticated;
grant update (first_name, last_name, date_of_birth, email, phone) on public.patients to authenticated;
create policy "Clinicians read patients" on public.patients for select to authenticated
  using ((select public.is_clinician()));
create policy "Clinicians create patients" on public.patients for insert to authenticated
  with check ((select public.is_clinician()) and created_by = (select auth.uid()));
create policy "Clinicians update patients" on public.patients for update to authenticated
  using ((select public.is_clinician())) with check ((select public.is_clinician()));

-- Medications and conditions ---------------------------------------------------
-- No deletes: stop a medication or resolve a condition so history is kept.
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  dose text not null default '' check (char_length(dose) <= 60),
  frequency text not null default '' check (char_length(frequency) <= 60),
  route text check (route is null or char_length(route) <= 40),
  start_date date,
  end_date date check (end_date is null or start_date is null or end_date >= start_date),
  status text not null default 'active' check (status in ('active', 'stopped')),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index medications_patient_idx on public.medications (patient_id, status);

create table public.medical_conditions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  condition text not null check (char_length(btrim(condition)) between 1 and 160),
  diagnosed_date date,
  status text not null default 'active' check (status in ('active', 'resolved')),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index medical_conditions_patient_idx on public.medical_conditions (patient_id, status);

alter table public.medications enable row level security;
revoke all on public.medications from anon, authenticated;
grant select on public.medications to authenticated;
grant insert (patient_id, name, dose, frequency, route, start_date, end_date, status, notes)
  on public.medications to authenticated;
grant update (name, dose, frequency, route, start_date, end_date, status, notes)
  on public.medications to authenticated;
create policy "Clinicians read medications" on public.medications for select to authenticated
  using ((select public.is_clinician()));
create policy "Clinicians create medications" on public.medications for insert to authenticated
  with check ((select public.is_clinician()) and created_by = (select auth.uid()));
create policy "Clinicians update medications" on public.medications for update to authenticated
  using ((select public.is_clinician())) with check ((select public.is_clinician()));

alter table public.medical_conditions enable row level security;
revoke all on public.medical_conditions from anon, authenticated;
grant select on public.medical_conditions to authenticated;
grant insert (patient_id, condition, diagnosed_date, status, notes)
  on public.medical_conditions to authenticated;
grant update (condition, diagnosed_date, status, notes)
  on public.medical_conditions to authenticated;
create policy "Clinicians read conditions" on public.medical_conditions for select to authenticated
  using ((select public.is_clinician()));
create policy "Clinicians create conditions" on public.medical_conditions for insert to authenticated
  with check ((select public.is_clinician()) and created_by = (select auth.uid()));
create policy "Clinicians update conditions" on public.medical_conditions for update to authenticated
  using ((select public.is_clinician())) with check ((select public.is_clinician()));

-- Consultations ---------------------------------------------------------------
-- Raw audio (storage), transcript, AI draft and final note are separate artefacts.
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null default auth.uid() references auth.users(id),
  consulted_at timestamptz not null default now(),
  status text not null default 'recording' check (status in (
    'recording', 'uploading', 'transcribing', 'draft_generated', 'reviewing', 'finalised'
  )),
  audio_path text check (audio_path is null or char_length(audio_path) <= 300),
  transcript text check (transcript is null or char_length(transcript) <= 200000),
  generated_draft jsonb check (generated_draft is null or jsonb_typeof(generated_draft) = 'object'),
  final_note jsonb check (final_note is null or jsonb_typeof(final_note) = 'object'),
  finalised_by uuid references auth.users(id),
  finalised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'finalised') = (finalised_at is not null and finalised_by is not null and final_note is not null))
);
create index consultations_patient_idx on public.consultations (patient_id, consulted_at desc);

-- Enforced in the database so direct API calls cannot bypass the review rules.
create function public.guard_consultation_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status = 'finalised' then
    raise exception 'A finalised consultation is read-only' using errcode = 'check_violation';
  end if;
  if old.transcript is not null and new.transcript is distinct from old.transcript then
    raise exception 'The raw transcript cannot be changed once written' using errcode = 'check_violation';
  end if;
  if old.generated_draft is not null and new.generated_draft is distinct from old.generated_draft then
    raise exception 'The AI draft cannot be changed once generated' using errcode = 'check_violation';
  end if;
  if old.audio_path is not null and new.audio_path is distinct from old.audio_path then
    raise exception 'The audio reference cannot be changed once set' using errcode = 'check_violation';
  end if;
  if new.status = 'finalised' then
    if new.final_note is null then
      raise exception 'A final note is required to finalise' using errcode = 'check_violation';
    end if;
    new.finalised_by = auth.uid();
    new.finalised_at = now();
  end if;
  new.updated_at = now();
  return new;
end;
$$;
create trigger consultations_guard before update on public.consultations
  for each row execute function public.guard_consultation_update();

alter table public.consultations enable row level security;
revoke all on public.consultations from anon, authenticated;
grant select on public.consultations to authenticated;
grant insert (patient_id, consulted_at) on public.consultations to authenticated;
grant update (status, audio_path, transcript, generated_draft, final_note)
  on public.consultations to authenticated;
create policy "Clinicians read consultations" on public.consultations for select to authenticated
  using ((select public.is_clinician()));
create policy "Clinicians start consultations" on public.consultations for insert to authenticated
  with check ((select public.is_clinician()) and doctor_id = (select auth.uid()));
create policy "Clinicians update consultations" on public.consultations for update to authenticated
  using ((select public.is_clinician())) with check ((select public.is_clinician()));
