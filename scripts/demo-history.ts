/**
 * Richer fictional history for the demo: past consultations with finalised notes (some
 * months old, some this week so the dashboard chart has shape), more tasks and three
 * more referrals in different states. Times are relative to "now". Fictional people only.
 */

type Note = {
  reasonForVisit: string;
  history: string;
  relevantMedicalHistory: string;
  currentMedications: string[];
  observations: string;
  assessment: string;
  plan: string;
  followUp: string;
};

const D = 24; // hours per day

export const historyConsultations: {
  n: number;
  patient: number;
  by: "a" | "b";
  hoursAgo: number;
  status: "finalised";
  transcript: string;
  draft: Note;
}[] = [
  // Existing patients: earlier visits ---------------------------------------------------
  {
    n: 101, patient: 1, by: "b", hoursAgo: 180 * D, status: "finalised",
    transcript: `Clinician: Aroha, this is your annual asthma review. How often are you using the blue inhaler?
Patient: Maybe once a week, mostly when I run.
Clinician: Peak flow is 450, your usual best. Inhaler technique is good. Keep your action plan on the fridge.`,
    draft: {
      reasonForVisit: "Annual asthma review.",
      history: "Reliever about once a week, mainly with exercise. No night waking.",
      relevantMedicalHistory: "Asthma (since 2019).",
      currentMedications: ["Salbutamol inhaler 100 mcg As needed"],
      observations: "Peak flow 450 (personal best). Chest clear. Good inhaler technique.",
      assessment: "Well-controlled asthma.",
      plan: "Continue salbutamol as needed. Written asthma action plan updated. Influenza vaccine given.",
      followUp: "Annual review, sooner if reliever needed more than twice a week.",
    },
  },
  {
    n: 102, patient: 2, by: "a", hoursAgo: 120 * D, status: "finalised",
    transcript: `Clinician: Tane, your HbA1c came back at 62, up from 55.
Patient: I've been eating more takeaways since the move.
Clinician: Feet look healthy, BP 136 over 82. Let's see a dietitian and recheck in three months.`,
    draft: {
      reasonForVisit: "Diabetes review with HbA1c result.",
      history: "More takeaway meals since moving house. No hypos. No foot problems.",
      relevantMedicalHistory: "Type 2 diabetes (since 2015). Hypercholesterolaemia (since 2016).",
      currentMedications: ["Metformin 500 mg Twice daily", "Atorvastatin 20 mg Once daily"],
      observations: "HbA1c 62 mmol/mol (previously 55). BP 136/82. Weight 94 kg. Foot check normal.",
      assessment: "Type 2 diabetes, control worsening with diet change.",
      plan: "Dietitian referral. Continue metformin. Repeat HbA1c and lipids in three months.",
      followUp: "Review with bloods in three months.",
    },
  },
  {
    n: 103, patient: 3, by: "b", hoursAgo: 95 * D, status: "finalised",
    transcript: `Patient: I rolled my ankle at netball on Saturday. It's swollen on the outside.
Clinician: You can walk four steps and there's no bony tenderness at the back of the ankle bones, so no X-ray is needed.
Clinician: This is a lateral ligament sprain. Rest, ice, compression and elevation, and I'll refer you to physio.`,
    draft: {
      reasonForVisit: "Right ankle injury playing netball.",
      history: "Inversion injury two days ago. Able to weight bear with pain.",
      relevantMedicalHistory: "Nil significant.",
      currentMedications: [],
      observations: "Swelling over lateral malleolus. Ottawa ankle rules negative. Able to walk four steps.",
      assessment: "Grade 2 lateral ankle ligament sprain.",
      plan: "RICE. Paracetamol as needed. ACC claim lodged. Physiotherapy referral.",
      followUp: "Return if unable to weight bear or not improving in two weeks.",
    },
  },
  {
    n: 104, patient: 4, by: "a", hoursAgo: 60 * D, status: "finalised",
    transcript: `Patient: My breathing's worse this week and I'm bringing up green phlegm.
Clinician: Sats are 91 percent, you've got scattered wheeze and crackles at the left base. Temperature 37.9.
Clinician: This is a COPD flare with infection. Prednisone for five days and an antibiotic. If you get worse, go to ED.`,
    draft: {
      reasonForVisit: "Increased breathlessness and purulent sputum for one week.",
      history: "Green sputum, more breathless on usual walk. No chest pain.",
      relevantMedicalHistory: "COPD (since 2018). Ex-smoker, 40 pack-years.",
      currentMedications: ["Tiotropium inhaler 18 mcg Once daily", "Salbutamol inhaler 100 mcg As needed"],
      observations: "SpO2 91% on air. Temp 37.9. Scattered wheeze, crackles left base. RR 22.",
      assessment: "Infective exacerbation of COPD.",
      plan: "Prednisone 40 mg daily for five days. Amoxicillin 500 mg three times daily for five days. Chest X-ray.",
      followUp: "Review in two days. ED if more breathless or drowsy.",
    },
  },
  {
    n: 105, patient: 5, by: "b", hoursAgo: 35 * D, status: "finalised",
    transcript: `Clinician: Priya, home readings average 128 over 78, which is good.
Patient: No dizziness, and I'm walking every morning now.
Clinician: Kidney function and potassium are normal. Stay on the same dose.`,
    draft: {
      reasonForVisit: "Blood pressure review.",
      history: "Home BP average 128/78. Walking daily. No side effects.",
      relevantMedicalHistory: "Hypertension (since 2020).",
      currentMedications: ["Cilazapril 2.5 mg Once daily"],
      observations: "Clinic BP 130/80. Creatinine and potassium normal.",
      assessment: "Hypertension, well controlled.",
      plan: "Continue cilazapril 2.5 mg daily.",
      followUp: "Review in six months with bloods.",
    },
  },
  {
    n: 106, patient: 6, by: "a", hoursAgo: 300 * D, status: "finalised",
    transcript: `Patient: I get burning in my chest after dinner, especially when I lie down.
Clinician: No weight loss, no trouble swallowing, no black stools. Tummy is soft.
Clinician: This sounds like reflux. Omeprazole for eight weeks and raise the head of the bed.`,
    draft: {
      reasonForVisit: "Burning chest pain after meals.",
      history: "Postprandial retrosternal burning, worse lying down. No red flags.",
      relevantMedicalHistory: "Nil significant.",
      currentMedications: [],
      observations: "Abdomen soft, non-tender. Weight stable.",
      assessment: "Gastro-oesophageal reflux disease.",
      plan: "Omeprazole 20 mg daily for eight weeks. Avoid late meals. Raise head of bed.",
      followUp: "Review in eight weeks, sooner if red flags.",
    },
  },
  {
    n: 107, patient: 7, by: "b", hoursAgo: 90 * D, status: "finalised",
    transcript: `Clinician: Sione, HbA1c is 71, still above target.
Patient: I've been forgetting the evening metformin.
Clinician: Let's add empagliflozin, which also helps the kidneys. Retinal screening is due.`,
    draft: {
      reasonForVisit: "Diabetes review.",
      history: "Missing evening metformin doses. No hypos.",
      relevantMedicalHistory: "Type 2 diabetes (since 2019).",
      currentMedications: ["Metformin 1 g Twice daily"],
      observations: "HbA1c 71 mmol/mol. BP 138/84. eGFR 72. Monofilament normal.",
      assessment: "Type 2 diabetes, suboptimal control.",
      plan: "Start empagliflozin 10 mg daily. Adherence tips and pill box. Retinal screening referral.",
      followUp: "Review in three months with HbA1c.",
    },
  },
  {
    n: 108, patient: 8, by: "a", hoursAgo: 42 * D, status: "finalised",
    transcript: `Patient: My hay fever is terrible this spring, itchy eyes and sneezing all day.
Clinician: Nose is congested, eyes a bit red, chest clear.
Clinician: Keep the cetirizine and add a steroid nasal spray daily through the season.`,
    draft: {
      reasonForVisit: "Seasonal hay fever symptoms.",
      history: "Sneezing, itchy eyes and congestion for three weeks. No wheeze.",
      relevantMedicalHistory: "Hay fever (since 2012).",
      currentMedications: ["Cetirizine 10 mg Once daily"],
      observations: "Pale boggy nasal mucosa. Mild conjunctival injection. Chest clear.",
      assessment: "Allergic rhinitis, seasonal flare.",
      plan: "Continue cetirizine. Start fluticasone nasal spray daily through spring.",
      followUp: "Return if wheeze develops.",
    },
  },

  // New patients ---------------------------------------------------------------------
  {
    n: 109, patient: 9, by: "a", hoursAgo: 45 * D, status: "finalised",
    transcript: `Patient: My big toe went red and so painful I couldn't put a sheet on it.
Clinician: Hot swollen first MTP joint, temperature normal. Urate is 0.52.
Clinician: Classic gout. Colchicine for the flare, and we'll increase allopurinol once it settles.`,
    draft: {
      reasonForVisit: "Acutely painful swollen right big toe.",
      history: "Sudden onset overnight after a family celebration. Previous gout in 2021.",
      relevantMedicalHistory: "Type 2 diabetes, hypertension, gout.",
      currentMedications: ["Metformin 1 g Twice daily", "Cilazapril 5 mg Once daily", "Allopurinol 300 mg Once daily"],
      observations: "Erythematous, hot, swollen right first MTP joint. Afebrile. Serum urate 0.52 mmol/L.",
      assessment: "Acute gout flare.",
      plan: "Colchicine 500 mcg twice daily for up to five days. Continue allopurinol. Repeat urate bloods in four weeks.",
      followUp: "Review once flare settled to titrate allopurinol.",
    },
  },
  {
    n: 110, patient: 10, by: "b", hoursAgo: 70 * D, status: "finalised",
    transcript: `Patient: My migraines are back to about four a month, usually around my period.
Clinician: Neurological exam is normal, blood pressure 118 over 72.
Clinician: Sumatriptan early in the attack, and let's keep a headache diary. We could consider a preventer.`,
    draft: {
      reasonForVisit: "More frequent migraines.",
      history: "Four migraines a month, menstrually related. Sumatriptan works if taken early. No aura.",
      relevantMedicalHistory: "Migraine without aura (since 2012). Iron deficiency earlier this year, treated.",
      currentMedications: ["Sumatriptan 50 mg As needed", "Ethinylestradiol with levonorgestrel 30/150 mcg Once daily"],
      observations: "BP 118/72. Normal neurological examination. Fundi normal.",
      assessment: "Menstrual migraine without aura.",
      plan: "Headache diary. Sumatriptan early in attacks. Discussed preventer options. Repeat bloods for ferritin in three months.",
      followUp: "Review in six weeks with diary.",
    },
  },
  {
    n: 111, patient: 11, by: "a", hoursAgo: 100 * D, status: "finalised",
    transcript: `Patient: My wife says I snore loudly and stop breathing at night. I'm exhausted at work.
Clinician: Epworth score is 15, neck 44 centimetres, BMI 33.
Clinician: This could be sleep apnoea. I'll refer you for a sleep study.`,
    draft: {
      reasonForVisit: "Snoring, witnessed apnoeas and daytime sleepiness.",
      history: "Loud snoring, partner reports pauses in breathing. Falls asleep in meetings. Drives for work.",
      relevantMedicalHistory: "Hypercholesterolaemia (since 2023).",
      currentMedications: ["Atorvastatin 40 mg Once daily"],
      observations: "Epworth Sleepiness Scale 15. Neck circumference 44 cm. BMI 33. BP 142/88.",
      assessment: "Suspected obstructive sleep apnoea.",
      plan: "Refer for sleep study. Advised not to drive if drowsy. Weight management discussed.",
      followUp: "Review after sleep study result.",
    },
  },
  {
    n: 112, patient: 12, by: "b", hoursAgo: 65 * D, status: "finalised",
    transcript: `Clinician: Ruth, your heart rate is 72 and regular today on the metoprolol.
Patient: No palpitations. I'm a bit unsteady on my knees though.
Clinician: Kidney function is fine for the apixaban dose. Let's arrange a falls assessment.`,
    draft: {
      reasonForVisit: "Atrial fibrillation review.",
      history: "No palpitations or bleeding. Knee pain and some unsteadiness walking.",
      relevantMedicalHistory: "Atrial fibrillation, osteoporosis, osteoarthritis of both knees, hypothyroidism.",
      currentMedications: ["Apixaban 5 mg Twice daily", "Metoprolol succinate 47.5 mg Once daily", "Alendronate 70 mg Once weekly", "Levothyroxine 75 mcg Once daily"],
      observations: "HR 72, irregular. BP 128/74. Creatinine 88, weight 61 kg. TSH normal.",
      assessment: "Rate-controlled AF, appropriately anticoagulated. Falls risk.",
      plan: "Continue current medicines. Falls risk assessment at home. Consider walking frame.",
      followUp: "Review in three months.",
    },
  },
  {
    n: 113, patient: 12, by: "a", hoursAgo: 3 * D, status: "finalised",
    transcript: `Patient: I tripped on the step and landed on my left hand. My wrist is really sore.
Clinician: There's a dinner fork deformity and tenderness over the distal radius. Sensation and circulation are fine.
Clinician: The X-ray shows a distal radius fracture. We'll put you in a backslab and refer you urgently to the fracture clinic.`,
    draft: {
      reasonForVisit: "Fall onto outstretched left hand.",
      history: "Tripped on front step this morning. Did not hit head. On apixaban.",
      relevantMedicalHistory: "Osteoporosis, atrial fibrillation on apixaban, osteoarthritis.",
      currentMedications: ["Apixaban 5 mg Twice daily", "Metoprolol succinate 47.5 mg Once daily", "Alendronate 70 mg Once weekly", "Levothyroxine 75 mcg Once daily"],
      observations: "Dinner fork deformity left wrist. Distal radius tenderness. Neurovascularly intact. X-ray: dorsally angulated distal radius fracture.",
      assessment: "Left distal radius (Colles) fracture, fragility fracture.",
      plan: "Below-elbow backslab. Paracetamol for pain. Urgent fracture clinic referral. ACC claim lodged.",
      followUp: "Fracture clinic within a week. Return if fingers become numb or swollen.",
    },
  },
  {
    n: 114, patient: 13, by: "b", hoursAgo: 5 * D, status: "finalised",
    transcript: `Patient: I twisted my knee in a tackle at rugby. It swelled up straight away.
Clinician: Big effusion, Lachman is a bit lax compared with the other side, but you can straight leg raise.
Clinician: Possible ACL injury. Brace, crutches, physio, and we'll see how it settles before an MRI.`,
    draft: {
      reasonForVisit: "Right knee twisting injury at rugby.",
      history: "Non-contact pivot, felt a pop, immediate swelling. Able to walk with a limp.",
      relevantMedicalHistory: "Childhood asthma, resolved.",
      currentMedications: [],
      observations: "Moderate effusion right knee. Lachman test lax with soft end point. Able to straight leg raise.",
      assessment: "Suspected anterior cruciate ligament injury.",
      plan: "Knee brace and crutches. ACC claim. Physiotherapy referral. Consider MRI if instability persists.",
      followUp: "Review in two weeks.",
    },
  },
  {
    n: 115, patient: 14, by: "a", hoursAgo: 100, status: "finalised",
    transcript: `Patient: This mole on my back has got darker and bigger over the summer.
Clinician: It's 8 millimetres, asymmetric with two colours and an irregular edge.
Clinician: I'd like a dermatologist to look at it soon.`,
    draft: {
      reasonForVisit: "Changing mole on back.",
      history: "Pigmented lesion noticed by partner to be enlarging and darkening. No bleeding.",
      relevantMedicalHistory: "Hypothyroidism, generalised anxiety.",
      currentMedications: ["Levothyroxine 100 mcg Once daily", "Sertraline 50 mg Once daily"],
      observations: "8 mm asymmetric pigmented lesion left upper back, two colours, irregular border. Dermoscopy: atypical network.",
      assessment: "Atypical naevus, melanoma to be excluded.",
      plan: "Refer to dermatology soon for excision. Photo taken for comparison.",
      followUp: "Dermatology outcome to be chased.",
    },
  },
  {
    n: 116, patient: 15, by: "b", hoursAgo: 140, status: "finalised",
    transcript: `Patient: I'm up four times a night to pass water and the stream is weak.
Clinician: Prostate feels smoothly enlarged, not hard. Urine dip is clear.
Clinician: We'll check a PSA and kidney function before changing anything.`,
    draft: {
      reasonForVisit: "Worsening urinary symptoms.",
      history: "Nocturia four times, poor stream, hesitancy. No blood in urine. No weight loss.",
      relevantMedicalHistory: "Benign prostatic hyperplasia, hypertension, chronic kidney disease stage 3a.",
      currentMedications: ["Tamsulosin 400 mcg Once daily", "Amlodipine 5 mg Once daily"],
      observations: "DRE: smooth, symmetrically enlarged prostate. Urine dipstick negative. BP 134/80.",
      assessment: "Lower urinary tract symptoms, likely BPH progression.",
      plan: "Bloods: PSA, creatinine and eGFR. Consider adding finasteride depending on results.",
      followUp: "Review with results in one week.",
    },
  },
  {
    n: 117, patient: 16, by: "a", hoursAgo: 28 * D, status: "finalised",
    transcript: `Patient: I've had three hypos this fortnight, mostly after netball in the evening.
Clinician: HbA1c is 58, which is good, but let's drop the evening dose on training days.
Clinician: Carry glucose tablets and check before driving.`,
    draft: {
      reasonForVisit: "Recurrent hypoglycaemia.",
      history: "Three hypos in two weeks after evening sport. Recognises symptoms. No severe episodes.",
      relevantMedicalHistory: "Type 1 diabetes (since 2014). Coeliac disease.",
      currentMedications: ["Insulin glargine 18 units Once daily at night", "Insulin aspart Per carb ratio 1:10 With meals"],
      observations: "HbA1c 58 mmol/mol. Injection sites normal. BP 112/70.",
      assessment: "Exercise-related hypoglycaemia in type 1 diabetes.",
      plan: "Reduce glargine to 16 units on training days. Carry glucose. Check before driving.",
      followUp: "Phone check with hypo diary in two weeks.",
    },
  },
  {
    n: 118, patient: 17, by: "b", hoursAgo: 30, status: "finalised",
    transcript: `Patient: My lower back went when I lifted a heavy box at work two weeks ago.
Clinician: No numbness in the saddle area, no bladder problems, reflexes are normal.
Clinician: This is mechanical back pain. Keep moving, paracetamol, and physio. Stop the ibuprofen with your blood pressure.`,
    draft: {
      reasonForVisit: "Low back pain after lifting.",
      history: "Two weeks of lumbar pain after lifting at work. No leg weakness. No red flags.",
      relevantMedicalHistory: "Hypertension (since 2022).",
      currentMedications: ["Losartan 50 mg Once daily", "Paracetamol 1 g Four times daily as needed"],
      observations: "Paraspinal tenderness L4–5. Straight leg raise negative. Normal power, sensation and reflexes.",
      assessment: "Acute mechanical low back pain.",
      plan: "Stay active. Paracetamol regularly. Stop ibuprofen. ACC claim and physiotherapy.",
      followUp: "Review in two weeks, sooner if red flags.",
    },
  },
  {
    n: 119, patient: 18, by: "a", hoursAgo: 2 * D, status: "finalised",
    transcript: `Mum: Isla's had a fever and been pulling at her right ear since yesterday.
Clinician: Temperature 38.4. The right eardrum is red and bulging. Left ear and throat are fine.
Clinician: This is a middle ear infection. Amoxicillin for five days and paracetamol for the pain.`,
    draft: {
      reasonForVisit: "Fever and right ear pain.",
      history: "One day of fever and ear pulling. Third ear infection this year. Eating and drinking.",
      relevantMedicalHistory: "Atopic eczema, recurrent otitis media.",
      currentMedications: ["Emollient cream Apply liberally Twice daily"],
      observations: "Temp 38.4. Right tympanic membrane red and bulging. Left normal. Throat clear. Well hydrated.",
      assessment: "Right acute otitis media.",
      plan: "Amoxicillin 250 mg/5 mL, 7.5 mL three times daily for five days. Paracetamol as needed.",
      followUp: "Review ears in two weeks. Consider ENT if further infections.",
    },
  },
];

export const historyTasks: {
  n: number;
  patient: number;
  consultation?: number;
  title: string;
  dueHours?: number;
  assigned: "a" | "b";
  done?: boolean;
}[] = [
  { n: 101, patient: 9, consultation: 109, title: "Repeat urate bloods in four weeks.", dueHours: -3 * D, assigned: "a" },
  { n: 102, patient: 10, consultation: 110, title: "Repeat bloods for ferritin in three months.", dueHours: 20 * D, assigned: "b" },
  { n: 103, patient: 11, consultation: 111, title: "Chase sleep study result.", dueHours: -D, assigned: "a" },
  { n: 104, patient: 12, consultation: 113, title: "Chase fracture clinic referral acknowledgement.", dueHours: -2 * D, assigned: "a", done: true },
  { n: 105, patient: 12, consultation: 112, title: "Arrange falls risk assessment at home.", dueHours: 5 * D, assigned: "b" },
  { n: 106, patient: 13, consultation: 114, title: "Chase physio referral acknowledgement.", dueHours: 2 * D, assigned: "b" },
  { n: 107, patient: 14, consultation: 115, title: "Chase dermatology referral acknowledgement.", dueHours: -6, assigned: "a" },
  { n: 108, patient: 15, consultation: 116, title: "Chase PSA and creatinine results.", dueHours: 6, assigned: "b" },
  { n: 109, patient: 16, consultation: 117, title: "Phone Leilani to check hypo diary.", dueHours: 2 * D, assigned: "a" },
  { n: 110, patient: 17, consultation: 118, title: "Review back pain in two weeks.", dueHours: 13 * D, assigned: "b" },
  { n: 111, patient: 18, consultation: 119, title: "Review Isla's ears in two weeks.", dueHours: 12 * D, assigned: "a" },
];

export const historyReferrals: {
  n: number;
  patient: number;
  consultation: number;
  facilityId: string;
  facilityName: string;
  service: "fracture_clinic" | "physiotherapy" | "dermatology";
  urgency: "routine" | "soon" | "urgent";
  reason: string;
  status: "sent" | "acknowledged" | "completed";
  task?: number;
  by: "a" | "b";
}[] = [
  {
    n: 2, patient: 12, consultation: 113, by: "a",
    facilityId: "f0000000-0000-4000-8000-000000000001", facilityName: "Christchurch Hospital Orthopaedic Services",
    service: "fracture_clinic", urgency: "urgent", status: "acknowledged", task: 104,
    reason: "Displaced left distal radius fracture after a fall. On apixaban. In a backslab.",
  },
  {
    n: 3, patient: 14, consultation: 115, by: "a",
    facilityId: "f0000000-0000-4000-8000-000000000014", facilityName: "Christchurch Dermatology",
    service: "dermatology", urgency: "soon", status: "sent", task: 107,
    reason: "Changing 8 mm pigmented lesion on the back, melanoma to be excluded.",
  },
  {
    n: 4, patient: 13, consultation: 114, by: "b",
    facilityId: "f0000000-0000-4000-8000-000000000008", facilityName: "Physiosouth – Moorhouse Medical",
    service: "physiotherapy", urgency: "routine", status: "sent", task: 106,
    reason: "Suspected ACL injury, right knee. Rehabilitation and assessment of instability.",
  },
  {
    n: 5, patient: 3, consultation: 103, by: "b",
    facilityId: "f0000000-0000-4000-8000-000000000009", facilityName: "Active Health Physiotherapy",
    service: "physiotherapy", urgency: "routine", status: "completed",
    reason: "Grade 2 lateral ankle sprain, return to netball.",
  },
];
