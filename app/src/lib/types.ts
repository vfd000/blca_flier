export type Role = "admin" | "volunteer";

export type DeliveryStatusValue = "not_started" | "delivered" | "no_answer" | "skipped";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: string;
}

export interface Zone {
  id: number;
  number: number;
  name: string | null;
  color: string | null;
  created_at: string;
}

export interface House {
  id: number;
  zone_id: number | null;
  address: string;
  lat: number | null;
  lng: number | null;
  notes: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Assignment {
  id: number;
  campaign_id: string;
  zone_id: number | null;
  house_id: number | null;
  volunteer_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

export interface DeliveryStatus {
  id: number;
  campaign_id: string;
  house_id: number;
  status: DeliveryStatusValue;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export const SUSPECT_EMPTY_NOTE = "Suspected empty";

export interface Invitation {
  id: number;
  email: string;
  role: Role;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
}

export const STATUS_COLORS: Record<DeliveryStatusValue, string> = {
  not_started: "#9ca3af", // gray
  no_answer: "#eab308", // yellow
  delivered: "#22c55e", // green
  skipped: "#ef4444", // red
};

export const STATUS_LABELS: Record<DeliveryStatusValue, string> = {
  not_started: "Not started",
  no_answer: "No answer",
  delivered: "Delivered",
  skipped: "Skipped",
};
