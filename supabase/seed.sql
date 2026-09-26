-- Fictional demo data only. Applied by `pnpm db:reset` on the local stack.
-- Create the demo clinicians afterwards with `pnpm db:seed-users`, then load
-- consultations, tasks and the roster with `pnpm db:seed-demo`.
-- NHIs use the Z-prefixed test range, which is never issued to real people.
insert into public.patients (id, first_name, last_name, date_of_birth, email, phone, nhi) values
  ('00000000-0000-4000-8000-000000000001', 'Aroha', 'Demo-Ngata', '1984-03-12', 'aroha.demo@example.com', '021 000 0001', 'ZZZ0016'),
  ('00000000-0000-4000-8000-000000000002', 'Tane', 'Demo-Walker', '1957-11-02', null, '021 000 0002', 'ZZZ0024'),
  ('00000000-0000-4000-8000-000000000003', 'Mei', 'Demo-Chen', '2001-07-25', 'mei.demo@example.com', null, 'ZZZ0032'),
  ('00000000-0000-4000-8000-000000000004', 'Hemi', 'Demo-Parata', '1951-05-19', null, '021 000 0004', 'ZZZ0040'),
  ('00000000-0000-4000-8000-000000000005', 'Priya', 'Demo-Nair', '1958-01-30', 'priya.demo@example.com', '021 000 0005', 'ZZZ0059'),
  ('00000000-0000-4000-8000-000000000006', 'Jack', 'Demo-Thompson', '1981-09-08', 'jack.demo@example.com', '021 000 0006', 'ZZZ0067'),
  ('00000000-0000-4000-8000-000000000007', 'Sione', 'Demo-Fifita', '1974-12-03', null, '021 000 0007', 'ZZZ0075'),
  ('00000000-0000-4000-8000-000000000008', 'Grace', 'Demo-Liu', '1993-04-17', 'grace.demo@example.com', '021 000 0008', 'ZZZ0083');

insert into public.medications (patient_id, name, dose, frequency, route, start_date, status) values
  ('00000000-0000-4000-8000-000000000001', 'Salbutamol inhaler', '100 mcg', 'As needed', 'Inhaled', '2019-05-01', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Metformin', '500 mg', 'Twice daily', 'Oral', '2015-02-10', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Atorvastatin', '20 mg', 'Once daily', 'Oral', '2016-08-22', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Amoxicillin', '500 mg', 'Three times daily', 'Oral', '2025-01-04', 'stopped'),
  ('00000000-0000-4000-8000-000000000004', 'Tiotropium inhaler', '18 mcg', 'Once daily', 'Inhaled', '2018-03-14', 'active'),
  ('00000000-0000-4000-8000-000000000004', 'Salbutamol inhaler', '100 mcg', 'As needed', 'Inhaled', '2018-03-14', 'active'),
  ('00000000-0000-4000-8000-000000000005', 'Cilazapril', '2.5 mg', 'Once daily', 'Oral', '2020-06-02', 'active'),
  ('00000000-0000-4000-8000-000000000006', 'Omeprazole', '20 mg', 'Once daily', 'Oral', '2024-11-20', 'active'),
  ('00000000-0000-4000-8000-000000000007', 'Metformin', '1 g', 'Twice daily', 'Oral', '2019-09-09', 'active'),
  ('00000000-0000-4000-8000-000000000007', 'Empagliflozin', '10 mg', 'Once daily', 'Oral', '2024-02-01', 'active'),
  ('00000000-0000-4000-8000-000000000008', 'Cetirizine', '10 mg', 'Once daily', 'Oral', '2023-10-01', 'active');

insert into public.medical_conditions (patient_id, condition, diagnosed_date, status) values
  ('00000000-0000-4000-8000-000000000001', 'Asthma', '2019-04-20', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Type 2 diabetes', '2015-01-30', 'active'),
  ('00000000-0000-4000-8000-000000000002', 'Hypercholesterolaemia', '2016-08-01', 'active'),
  ('00000000-0000-4000-8000-000000000003', 'Sprained ankle', '2024-06-11', 'resolved'),
  ('00000000-0000-4000-8000-000000000004', 'COPD', '2018-03-01', 'active'),
  ('00000000-0000-4000-8000-000000000005', 'Hypertension', '2020-05-20', 'active'),
  ('00000000-0000-4000-8000-000000000006', 'Gastro-oesophageal reflux', '2024-11-20', 'active'),
  ('00000000-0000-4000-8000-000000000007', 'Type 2 diabetes', '2019-09-01', 'active'),
  ('00000000-0000-4000-8000-000000000008', 'Hay fever', '2012-09-01', 'active');
