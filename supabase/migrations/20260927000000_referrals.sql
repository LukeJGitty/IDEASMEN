-- Referrals: a directory of Canterbury facilities (with availability the team keeps up to
-- date) and the referrals clinicians make to them. Each referral gets a "chase" task.

-- Facilities -----------------------------------------------------------------------
-- Real facility names and contact details (checked Sept 2026 from official pages). Wait
-- times are not published by these providers, so they start as labelled estimates;
-- when a clinician updates one it is stamped with who and when, and no longer an estimate.
create table public.referral_facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  services text[] not null check (
    cardinality(services) between 1 and 10
    and services <@ array['fracture_clinic', 'orthopaedics', 'xray', 'ct_mri', 'ultrasound',
      'physiotherapy', 'cardiology', 'urgent_care', 'dermatology', 'surgery']::text[]
  ),
  sector text not null check (sector in ('public', 'private')),
  address text not null check (char_length(address) <= 200),
  phone text check (phone is null or char_length(phone) <= 40),
  website text check (website is null or website ~ '^https://[^\s]+$'),
  hours text check (hours is null or char_length(hours) <= 200),
  access_note text check (access_note is null or char_length(access_note) <= 300),
  acc_funded boolean not null default false,
  accepting boolean not null default true,
  wait_days integer check (wait_days is null or wait_days between 0 and 730),
  wait_is_estimate boolean not null default true,
  fee_nzd integer check (fee_nzd is null or fee_nzd between 0 and 100000),
  price_note text check (price_note is null or char_length(price_note) <= 300),
  source_url text check (source_url is null or source_url ~ '^https://[^\s]+$'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Clinician edits are stamped by the database; a changed wait time is no longer an estimate.
create function public.stamp_referral_facility() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.wait_days is distinct from old.wait_days then
    new.wait_is_estimate = false;
  end if;
  new.updated_by = auth.uid();
  new.updated_at = now();
  return new;
end;
$$;
create trigger referral_facilities_stamp before update on public.referral_facilities
  for each row execute function public.stamp_referral_facility();

alter table public.referral_facilities enable row level security;
revoke all on public.referral_facilities from anon, authenticated;
grant select on public.referral_facilities to authenticated;
grant update (accepting, wait_days, fee_nzd, price_note, access_note, hours)
  on public.referral_facilities to authenticated;
create policy "Clinicians read facilities" on public.referral_facilities for select to authenticated
  using ((select public.is_clinician()));
create policy "Clinicians update availability" on public.referral_facilities for update to authenticated
  using ((select public.is_clinician())) with check ((select public.is_clinician()));

-- Referrals ------------------------------------------------------------------------
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  consultation_id uuid references public.consultations(id) on delete set null,
  facility_id uuid not null references public.referral_facilities(id) on delete restrict,
  service text not null check (service in ('fracture_clinic', 'orthopaedics', 'xray', 'ct_mri',
    'ultrasound', 'physiotherapy', 'cardiology', 'urgent_care', 'dermatology', 'surgery')),
  urgency text not null default 'routine' check (urgency in ('routine', 'soon', 'urgent')),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  letter text not null check (char_length(letter) between 1 and 10000),
  status text not null default 'sent'
    check (status in ('sent', 'acknowledged', 'completed', 'cancelled')),
  task_id uuid references public.tasks(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index referrals_patient_idx on public.referrals (patient_id, created_at desc);
create index referrals_status_idx on public.referrals (status, created_at desc);

create function public.touch_referral() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger referrals_touch before update on public.referrals
  for each row execute function public.touch_referral();

alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;
grant insert (patient_id, consultation_id, facility_id, service, urgency, reason, letter, task_id)
  on public.referrals to authenticated;
grant update (status, letter, task_id) on public.referrals to authenticated;
create policy "Clinicians read referrals" on public.referrals for select to authenticated
  using ((select public.is_clinician()));
create policy "Clinicians create referrals" on public.referrals for insert to authenticated
  with check ((select public.is_clinician()) and created_by = (select auth.uid()));
create policy "Clinicians update referrals" on public.referrals for update to authenticated
  using ((select public.is_clinician())) with check ((select public.is_clinician()));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.referrals, public.referral_facilities;
  end if;
end;
$$;

-- Directory ------------------------------------------------------------------------
-- Estimated waits are illustrative starting points only: always confirm with the facility.
insert into public.referral_facilities
  (id, name, services, sector, address, phone, website, hours, access_note, acc_funded,
   wait_days, fee_nzd, price_note, source_url)
values
  ('f0000000-0000-4000-8000-000000000001', 'Christchurch Hospital Orthopaedic Services',
   array['fracture_clinic', 'orthopaedics'], 'public',
   'Ground floor, Parkside East, Christchurch Hospital, Riccarton Ave, Christchurch', '03 364 0800',
   'https://info.health.nz/locations/canterbury/orthopaedic-services-canterbury',
   'Outpatients Mon–Fri 8am–4:30pm; acute care 7 days 8am–11pm',
   'Referral required. Care for broken or damaged bones.', true,
   7, 0, 'Free for eligible patients. Injuries covered by ACC.',
   'https://info.health.nz/locations/canterbury/orthopaedic-services-canterbury'),
  ('f0000000-0000-4000-8000-000000000002', 'Burwood Hospital Orthopaedic Outpatients',
   array['orthopaedics'], 'public', '300 Burwood Rd, Burwood, Christchurch', '03 383 6840',
   'https://info.health.nz/locations/canterbury/burwood-hospital', null,
   'Referral required. Elective orthopaedic assessment and surgery.', false,
   150, 0, 'Free for eligible patients.',
   'https://info.health.nz/locations/canterbury/burwood-hospital'),
  ('f0000000-0000-4000-8000-000000000003', 'Forte Orthopaedics (Forté Health)',
   array['orthopaedics'], 'private', 'Ground floor, 132 Peterborough St, Christchurch', '03 365 8333',
   'https://www.fortehealth.co.nz', null, 'Specialist referral.', true,
   14, null, 'Specialist fees on request. Health insurance or ACC may cover.',
   'https://www.healthpoint.co.nz/private/orthopaedics/forte-orthopaedics/'),
  ('f0000000-0000-4000-8000-000000000004', 'Pacific Radiology – Riccarton',
   array['xray', 'ct_mri'], 'private', '4–6 Yaldhurst Rd, Upper Riccarton, Christchurch', '03 379 0770',
   'https://pacificradiology.com', 'X-ray at Riccarton Clinic 8am–8pm daily', null, true,
   0, null, 'Fees apply, paid on the day. ACC part-charge for injuries. Southern Cross Affiliated Provider.',
   'https://pacificradiology.com/patients/payments'),
  ('f0000000-0000-4000-8000-000000000005', 'Pacific Radiology – Forté Health',
   array['xray', 'ultrasound', 'ct_mri'], 'private', '132 Peterborough St, Christchurch', '03 379 0770',
   'https://pacificradiology.com', null, null, true,
   3, null, 'Fees apply, paid on the day. ACC part-charge for injuries.',
   'https://www.healthpoint.co.nz/private/radiology/pacific-radiology-canterbury/'),
  ('f0000000-0000-4000-8000-000000000006', 'Beyond Radiology – Christchurch',
   array['ct_mri', 'xray', 'ultrasound'], 'private', '225 Papanui Rd, Merivale, Christchurch', '03 964 7459',
   'https://beyondradiology.co.nz/locations/christchurch/', null,
   'Confirm which scans this site offers when booking.', true,
   5, null, 'Fees on request.', 'https://beyondradiology.co.nz/locations/christchurch/'),
  ('f0000000-0000-4000-8000-000000000007', 'North Canterbury X-ray',
   array['xray'], 'private', '237c High St, Rangiora', null,
   'https://northcanterburyxray.co.nz', null, null, true,
   1, 121, 'ACC part-charge $55–60 for one region. Private X-ray $121–$295 by body region.',
   'https://northcanterburyxray.co.nz/fees'),
  ('f0000000-0000-4000-8000-000000000008', 'Physiosouth – Moorhouse Medical',
   array['physiotherapy'], 'private', '3 Pilgrim Place, Sydenham, Christchurch', '03 377 0612',
   'https://www.physiosouth.co.nz/locations/moorhouse-medical/', null, null, true,
   2, null, 'ACC-funded for injuries; part-charge on request.',
   'https://www.physiosouth.co.nz/locations/moorhouse-medical/'),
  ('f0000000-0000-4000-8000-000000000009', 'Active Health Physiotherapy',
   array['physiotherapy'], 'private', 'Six clinics across Christchurch', '03 383 6290',
   'https://activehealth.co.nz/christchurch/physiotherapy/', null, null, true,
   3, null, 'Fees on request. ACC-funded for injuries.',
   'https://activehealth.co.nz/christchurch/physiotherapy/'),
  ('f0000000-0000-4000-8000-000000000010', 'Christchurch Hospital Cardiology',
   array['cardiology'], 'public',
   'Cardiology Day Unit, Level 1, Parkside West, Christchurch Hospital, Riccarton Ave, Christchurch',
   '03 364 0640', 'https://info.health.nz/locations/canterbury/cardiology-canterbury', null,
   'Referral required. Tertiary cardiology for the South Island.', false,
   90, 0, 'Free for eligible patients.',
   'https://info.health.nz/locations/canterbury/cardiology-canterbury'),
  ('f0000000-0000-4000-8000-000000000011', 'Christchurch Heart Group',
   array['cardiology'], 'private', 'Level 1, Milford Chambers, St George''s Hospital, 249 Papanui Rd, Christchurch',
   '03 355 3750', 'https://christchurchheartgroup.co.nz', null, 'Specialist referral.', false,
   10, null, 'Specialist fees on request. Health insurance may cover.',
   'https://christchurchheartgroup.co.nz/contact/'),
  ('f0000000-0000-4000-8000-000000000012', '24 Hour Surgery (Pegasus Health)',
   array['urgent_care', 'fracture_clinic', 'xray'], 'private', '401 Madras St, Christchurch', '03 365 7777',
   'https://www.pegasus.health.nz/24-hour-surgery', 'Open 24 hours, every day',
   'Walk-in. On-site fracture clinic and X-ray.', true,
   0, 70, 'Adults: weekday $50 enrolled / $70 not enrolled; with ACC $43.50 / $63.50; nights and weekends $62.50 / $82.50. X-ray billed separately.',
   'https://docs.pegasus.health.nz/public-documents/Patient-Fees-14-and-over-JUNE-2026.pdf'),
  ('f0000000-0000-4000-8000-000000000013', 'Riccarton Clinic',
   array['urgent_care', 'xray'], 'private', '4 Yaldhurst Rd, Upper Riccarton, Christchurch', '03 343 3661',
   'https://www.riccartonclinic.co.nz', '8am–8pm, every day', 'Walk-in. On-site X-ray (Pacific Radiology).', true,
   0, null, 'See the clinic''s published fee list. X-ray billed separately by Pacific Radiology.',
   'https://www.riccartonclinic.co.nz/contact-us'),
  ('f0000000-0000-4000-8000-000000000014', 'Christchurch Dermatology',
   array['dermatology'], 'private', '154 Leinster Rd, Merivale, Christchurch', '03 355 4477',
   'https://www.chchdermatology.co.nz', null, 'New patients need a referral.', false,
   21, null, 'Fees on request. Southern Cross affiliated.', 'https://www.chchdermatology.co.nz/'),
  ('f0000000-0000-4000-8000-000000000015', 'MoleMap Merivale',
   array['dermatology'], 'private', 'Level 1, Shop 10, 189 Papanui Rd, Merivale, Christchurch', '0800 665 362',
   'https://www.molemap.co.nz', null, 'Skin checks and skin cancer treatment.', false,
   7, null, 'Fees on request.', 'https://www.molemap.co.nz/clinics/south-island/christchurch-merivale'),
  ('f0000000-0000-4000-8000-000000000016', 'Southern Cross Christchurch Hospital',
   array['surgery', 'orthopaedics'], 'private', '131 Bealey Ave, Christchurch', '03 968 3100',
   'https://healthcare.southerncross.co.nz/christchurch-hospital', null,
   'Private surgical hospital; admission through a specialist.', false,
   21, null, 'Estimates on request. Health insurance may cover.',
   'https://healthcare.southerncross.co.nz/christchurch-hospital'),
  ('f0000000-0000-4000-8000-000000000017', 'St George''s Hospital',
   array['surgery', 'cardiology'], 'private', '249 Papanui Rd, Strowan, Christchurch', '03 375 6000',
   'https://www.stgeorges.org.nz', null,
   'Private surgical hospital; Heart Centre for angiograms and interventional cardiology.', false,
   14, null, 'Estimates on request (03 375 6101).', 'https://www.stgeorges.org.nz/patients/fees-payments');
