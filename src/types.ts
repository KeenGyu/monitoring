export type ReportStatus = "not-started" | "in-progress" | "submitted";

/** Derived at render time — never persisted as its own status. */
export type DisplayStatus = ReportStatus | "overdue";

export interface Report {
  id: string;
  name: string;
  category: string;
  description: string;
  status: ReportStatus;
  createdAt: string; // ISO datetime
  dueDate: string | null; // ISO date (yyyy-mm-dd)
  monitoringStart: string | null; // ISO date
  monitoringEnd: string | null; // ISO date
  supervisor: string;
  proofRequired: boolean;
  proofImage: string | null; // dataURL, stored in IndexedDB
  funnyReactionImage: string | null; // dataURL
  submittedAt: string | null; // ISO datetime
  submissionNotes: string;
}

export type ActivityType =
  | "created"
  | "status-changed"
  | "submitted"
  | "proof-added"
  | "proof-removed"
  | "edited"
  | "deleted";

export interface ActivityEvent {
  id: string;
  timestamp: string; // ISO datetime
  reportId: string;
  reportName: string;
  type: ActivityType;
  message: string;
  detail?: string;
}

export interface MonitoringPeriod {
  startMonth: string; // yyyy-mm
  endMonth: string; // yyyy-mm
}

export interface Profile {
  name: string;
  role: string;
}

export interface AppSettings {
  monitoringPeriod: MonitoringPeriod;
  profile: Profile;
}

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  reports: Report[];
  activity: ActivityEvent[];
  settings: AppSettings;
  absentees: Absentee[];
}

export type AbsenceType =
  | "Sick Leave"
  | "Vacation Leave"
  | "Emergency Leave"
  | "Undertime"
  | "AWOL"
  | "Other";

export type AbsenceStatus = "pending" | "approved" | "unapproved";

export interface Absentee {
  id: string;
  employeeName: string;
  department: string;
  date: string; // ISO date (yyyy-mm-dd) of the absence
  type: AbsenceType;
  remarks: string;
  status: AbsenceStatus;
  createdAt: string; // ISO datetime, when this was logged
}

export type NewAbsenteeInput = Pick<
  Absentee,
  "employeeName" | "department" | "date" | "type" | "remarks" | "status"
>;

export type NewReportInput = Pick<
  Report,
  | "name"
  | "category"
  | "description"
  | "dueDate"
  | "monitoringStart"
  | "monitoringEnd"
  | "supervisor"
  | "proofRequired"
> & { funnyReactionImage?: string | null };

export interface SubmissionInput {
  submittedAt: string; // ISO datetime, combined date+time
  supervisor: string;
  submissionNotes: string;
  proofImage: string | null;
}
