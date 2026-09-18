import type { DisplayStatus, Report } from "../types";
import { isPastDue } from "./dates";

/** Derives the status shown in the UI. Overdue is never stored — only computed. */
export function displayStatus(report: Report): DisplayStatus {
  if (report.status === "submitted") return "submitted";
  if (isPastDue(report.dueDate)) return "overdue";
  return report.status;
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  submitted: "Submitted",
  overdue: "Overdue",
};

export const STATUS_DOT: Record<DisplayStatus, string> = {
  "not-started": "\u26aa",
  "in-progress": "\ud83d\udfe1",
  submitted: "\ud83d\udfe2",
  overdue: "\ud83d\udd34",
};

export function needsAttention(report: Report): boolean {
  return displayStatus(report) !== "submitted";
}
