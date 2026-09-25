-- Fictional demo data only. Applied by `pnpm db:reset` on the local stack.
-- Create the demo clinicians afterwards with `pnpm db:seed-users`.
insert into public.patients (id, first_name, last_name, date_of_birth, email, phone) values
  ('00000000-0000-4000-8000-000000000001', 'Aroha', 'Demo-Ngata', '1984-03-12', 'aroha.demo@example.com', '021 000 0001'),
  ('00000000-0000-4000-8000-000000000002', 'Tane', 'Demo-Walker', '1957-11-02', null, '021 000 0002'),
  ('00000000-0000-4000-8000-000000000003', 'Mei', 'Demo-Chen', '2001-07-25', 'mei.demo@example.com', null);

insert into public.medications (patient_id, name, dose, frequency, route, start_date, status) values
  ('00000000-0000-4000-8000-000000000001', 'Salbutamol inhaler', '100 mcg', 'As needed', 'Inhaled', '2019-05-01', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Metformin', '500 mg', 'Twice daily', 'Oral', '2015-02-10', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Atorvastatin', '20 mg', 'Once daily', 'Oral', '2016-08-22', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Amoxicillin', '500 mg', 'Three times daily', 'Oral', '2025-01-04', 'stopped');

insert into public.medical_conditions (patient_id, condition, diagnosed_date, status) values
  ('00000000-0000-4000-8000-000000000001', 'Asthma', '2019-04-20', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Type 2 diabetes', '2015-01-30', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Hypercholesterolaemia', '2016-08-01', 'active'),
  ('00000000-0000-4000-8000-000000000003', 'Sprained ankle', '2024-06-11', 'resolved');
