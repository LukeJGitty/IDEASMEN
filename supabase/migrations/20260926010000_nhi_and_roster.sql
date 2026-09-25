-- NHI numbers on patients, and a simple staff roster.

-- NHI ----------------------------------------------------------------------------
-- National Health Index number: 3 letters (no I or O) then either 4 digits (old
-- format) or 2 digits and 2 letters (new format). Stored upper-case. Optional so
-- existing patients stay valid; unique when present. Demo data uses Z-prefixed
-- test NHIs only.
alter table public.patients add column nhi text
  check (nhi is null or nhi ~ '^[A-HJ-NP-Z]{3}([0-9]{4}|[0-9]{2}[A-HJ-NP-Z]{2})$');
create unique index patients_nhi_key on public.patients (nhi) where nhi is not null;
grant insert (nhi), update (nhi) on public.patients to authenticated;

-- Roster -------------------------------------------------------------------------
-- Staff shifts by area. Staff are named, not linked to accounts, so reception and
-- nursing staff can be rostered without a Hippo login. Shared by all clinicians.
create table public.roster_shifts (
  id uuid primary key default gen_random_uuid(),
  staff_name text not null check (char_length(btrim(staff_name)) between 1 and 80),
  role text not null check (role in ('doctor', 'nurse', 'reception', 'other')),
  area text not null default 'Clinic' check (char_length(btrim(area)) between 1 and 60),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text check (notes is null or char_length(notes) <= 200),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '24 hours')
);
create index roster_shifts_time_idx on public.roster_shifts (starts_at, ends_at);

alter table public.roster_shifts enable row level security;
revoke all on public.roster_shifts from anon, authenticated;
grant select, delete on public.roster_shifts to authenticated;
grant insert (staff_name, role, area, starts_at, ends_at, notes) on public.roster_shifts to authenticated;
grant update (staff_name, role, area, starts_at, ends_at, notes) on public.roster_shifts to authenticated;
create policy "Clinicians read roster" on public.roster_shifts for select to authenticated
  using ((select public.is_clinician()));
create policy "Clinicians add shifts" on public.roster_shifts for insert to authenticated
  with check ((select public.is_clinician()) and created_by = (select auth.uid()));
create policy "Clinicians change shifts" on public.roster_shifts for update to authenticated
  using ((select public.is_clinician())) with check ((select public.is_clinician()));
create policy "Clinicians remove shifts" on public.roster_shifts for delete to authenticated
  using ((select public.is_clinician()));
