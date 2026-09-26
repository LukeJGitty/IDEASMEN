export type ReferralService =
  | "fracture_clinic"
  | "orthopaedics"
  | "xray"
  | "ct_mri"
  | "ultrasound"
  | "physiotherapy"
  | "cardiology"
  | "urgent_care"
  | "dermatology"
  | "surgery";

export type ReferralUrgency = "routine" | "soon" | "urgent";
export type ReferralStatus = "sent" | "acknowledged" | "completed" | "cancelled";

export interface ReferralFacility {
  id: string;
  name: string;
  services: ReferralService[];
  sector: "public" | "private";
  address: string;
  phone?: string;
  website?: string;
  hours?: string;
  accessNote?: string;
  accFunded: boolean;
  accepting: boolean;
  waitDays?: number;
  waitIsEstimate: boolean;
  feeNzd?: number;
  priceNote?: string;
  sourceUrl?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface Referral {
  id: string;
  patientId: string;
  consultationId?: string;
  facilityId: string;
  service: ReferralService;
  urgency: ReferralUrgency;
  reason: string;
  letter: string;
  status: ReferralStatus;
  taskId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
