export type UserRole = "USER" | "ADMIN" | "AUTHORITY";

export interface PublicUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  authority_id?: string | null;
  authority_name?: string | null;
  phone?: string | null;
  created_at: string;
}

export interface BoundingBox {
  x: number; // percentage left 0-100
  y: number; // percentage top 0-100
  width: number; // percentage width 0-100
  height: number; // percentage height 0-100
}

export interface InspectionResult {
  id: string;
  user_id?: string | null;
  image_url?: string | null;
  image_base64?: string | null;
  detected: boolean;
  damage_type: string;
  confidence: number;
  severity: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  severity_reason: string;
  bounding_box: BoundingBox;
  recommended_action: string;
  estimated_repair_priority: string;
  latitude: number;
  longitude: number;
  location_name: string;
  created_at: string;
}

export type ComplaintStatus =
  | "SUBMITTED"
  | "ASSIGNED"
  | "ACKNOWLEDGED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export interface StatusHistoryItem {
  id: string;
  status: ComplaintStatus;
  previous_status?: ComplaintStatus | null;
  changed_by_user_id: string;
  changed_by_name: string;
  changed_by_role: string;
  notes?: string;
  timestamp: string;
}

export interface RepairEvidence {
  image_url?: string | null;
  image_base64?: string | null;
  notes?: string;
  resolved_by_name?: string;
  resolved_at?: string;
}

export interface Complaint {
  id: string;
  inspection_id?: string | null;
  user_id: string;
  user_name: string;
  user_phone?: string;
  title: string;
  description?: string;
  damage_type: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  confidence: number;
  bounding_box?: BoundingBox;
  image_url?: string | null;
  image_base64?: string | null;
  latitude: number;
  longitude: number;
  location_name: string;
  landmark?: string;
  status: ComplaintStatus;
  assigned_authority_id?: string | null;
  assigned_authority_name?: string | null;
  repair_evidence?: RepairEvidence | null;
  status_history: StatusHistoryItem[];
  created_at: string;
  updated_at: string;
}

export interface Authority {
  id: string;
  code: string;
  name: string;
  zone: string;
  coverage_area: string;
  contact_email: string;
  contact_phone: string;
  active_complaints_count: number;
  resolved_count: number;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id?: string | null;
  broadcast_role?: string | null;
  title: string;
  message: string;
  notification_type: "STATUS_CHANGE" | "ASSIGNMENT" | "RESOLUTION" | "ALERT";
  complaint_id?: string | null;
  severity?: string;
  read: boolean;
  created_at: string;
}

export interface AdminStats {
  total_complaints: number;
  resolution_rate_percent: number;
  by_status: {
    SUBMITTED: number;
    ASSIGNED: number;
    ACKNOWLEDGED: number;
    IN_PROGRESS: number;
    RESOLVED: number;
    CLOSED: number;
  };
  by_severity: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  authorities_count: number;
  users_count: number;
}
