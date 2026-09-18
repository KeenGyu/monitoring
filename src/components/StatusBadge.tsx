import type { DisplayStatus } from "../types";
import { STATUS_LABEL } from "../lib/status";
import "./StatusBadge.css";

const CLASS_BY_STATUS: Record<DisplayStatus, string> = {
  "not-started": "status-neutral",
  "in-progress": "status-progress",
  submitted: "status-submitted",
  overdue: "status-overdue",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span className={`status-badge ${CLASS_BY_STATUS[status]}`}>
      <span className="status-dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}
