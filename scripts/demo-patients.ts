/**
 * The fictional demo patients, identical to supabase/seed.sql (a test checks they match).
 * Used to load a hosted demo project, where seed.sql is not run.
 */
import type { Database } from "../lib/database.types";

type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];

export const P = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

export const demoPatients: Insert<"patients">[] = [
  { id: P(1), first_name: "Aroha", last_name: "Demo-Ngata", date_of_birth: "1984-03-12", email: "aroha.demo@example.com", phone: "021 000 0001", nhi: "ZZZ0016" },
  { id: P(2), first_name: "Tane", last_name: "Demo-Walker", date_of_birth: "1957-11-02", email: null, phone: "021 000 0002", nhi: "ZZZ0024" },
  { id: P(3), first_name: "Mei", last_name: "Demo-Chen", date_of_birth: "2001-07-25", email: "mei.demo@example.com", phone: null, nhi: "ZZZ0032" },
  { id: P(4), first_name: "Hemi", last_name: "Demo-Parata", date_of_birth: "1951-05-19", email: null, phone: "021 000 0004", nhi: "ZZZ0040" },
  { id: P(5), first_name: "Priya", last_name: "Demo-Nair", date_of_birth: "1958-01-30", email: "priya.demo@example.com", phone: "021 000 0005", nhi: "ZZZ0059" },
  { id: P(6), first_name: "Jack", last_name: "Demo-Thompson", date_of_birth: "1981-09-08", email: "jack.demo@example.com", phone: "021 000 0006", nhi: "ZZZ0067" },
  { id: P(7), first_name: "Sione", last_name: "Demo-Fifita", date_of_birth: "1974-12-03", email: null, phone: "021 000 0007", nhi: "ZZZ0075" },
  { id: P(8), first_name: "Grace", last_name: "Demo-Liu", date_of_birth: "1993-04-17", email: "grace.demo@example.com", phone: "021 000 0008", nhi: "ZZZ0083" },
];

export const demoMedications: Insert<"medications">[] = [
  { patient_id: P(1), name: "Salbutamol inhaler", dose: "100 mcg", frequency: "As needed", route: "Inhaled", start_date: "2019-05-01", status: "active" },
  { patient_id: P(2), name: "Metformin", dose: "500 mg", frequency: "Twice daily", route: "Oral", start_date: "2015-02-10", status: "active" },
  { patient_id: P(2), name: "Atorvastatin", dose: "20 mg", frequency: "Once daily", route: "Oral", start_date: "2016-08-22", status: "active" },
  { patient_id: P(2), name: "Amoxicillin", dose: "500 mg", frequency: "Three times daily", route: "Oral", start_date: "2025-01-04", status: "stopped" },
  { patient_id: P(4), name: "Tiotropium inhaler", dose: "18 mcg", frequency: "Once daily", route: "Inhaled", start_date: "2018-03-14", status: "active" },
  { patient_id: P(4), name: "Salbutamol inhaler", dose: "100 mcg", frequency: "As needed", route: "Inhaled", start_date: "2018-03-14", status: "active" },
  { patient_id: P(5), name: "Cilazapril", dose: "2.5 mg", frequency: "Once daily", route: "Oral", start_date: "2020-06-02", status: "active" },
  { patient_id: P(6), name: "Omeprazole", dose: "20 mg", frequency: "Once daily", route: "Oral", start_date: "2024-11-20", status: "active" },
  { patient_id: P(7), name: "Metformin", dose: "1 g", frequency: "Twice daily", route: "Oral", start_date: "2019-09-09", status: "active" },
  { patient_id: P(7), name: "Empagliflozin", dose: "10 mg", frequency: "Once daily", route: "Oral", start_date: "2024-02-01", status: "active" },
  { patient_id: P(8), name: "Cetirizine", dose: "10 mg", frequency: "Once daily", route: "Oral", start_date: "2023-10-01", status: "active" },
];

export const demoConditions: Insert<"medical_conditions">[] = [
  { patient_id: P(1), condition: "Asthma", diagnosed_date: "2019-04-20", status: "active" },
  { patient_id: P(2), condition: "Type 2 diabetes", diagnosed_date: "2015-01-30", status: "active" },
  { patient_id: P(2), condition: "Hypercholesterolaemia", diagnosed_date: "2016-08-01", status: "active" },
  { patient_id: P(3), condition: "Sprained ankle", diagnosed_date: "2024-06-11", status: "resolved" },
  { patient_id: P(4), condition: "COPD", diagnosed_date: "2018-03-01", status: "active" },
  { patient_id: P(5), condition: "Hypertension", diagnosed_date: "2020-05-20", status: "active" },
  { patient_id: P(6), condition: "Gastro-oesophageal reflux", diagnosed_date: "2024-11-20", status: "active" },
  { patient_id: P(7), condition: "Type 2 diabetes", diagnosed_date: "2019-09-01", status: "active" },
  { patient_id: P(8), condition: "Hay fever", diagnosed_date: "2012-09-01", status: "active" },
];
