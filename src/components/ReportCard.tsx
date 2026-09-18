import type { Report } from "../types";
import { StatusBadge } from "./StatusBadge";
import { displayStatus } from "../lib/status";
import { formatDate, formatDateTime } from "../lib/dates";
import "./ReportCard.css";

interface ReportCardProps {
  report: Report;
  onOpen: () => void;
  onEdit: () => void;
  onMarkInProgress: () => void;
  onSubmit: () => void;
}

export function ReportCard({
  report,
  onOpen,
  onEdit,
  onMarkInProgress,
  onSubmit,
}: ReportCardProps) {
  const status = displayStatus(report);
  const isSubmitted = status === "submitted";

  return (
    <div className={`report-card ${isSubmitted ? "is-submitted" : ""}`}>
      <button className="report-card-main" onClick={onOpen}>
        <div className="report-card-top">
          <span className="report-card-name">{report.name}</span>
          <StatusBadge status={status} />
        </div>
        {report.category ? (
          <div className="report-card-category">{report.category}</div>
        ) : null}

        <div className="report-card-meta">
          {report.dueDate ? (
            <span>Due {formatDate(report.dueDate)}</span>
          ) : (
            <span className="muted">No due date</span>
          )}
          {isSubmitted && report.submittedAt ? (
            <span>Submitted {formatDateTime(report.submittedAt)}</span>
          ) : null}
        </div>

        <div className="report-card-proof">
          {isSubmitted ? (
            report.proofImage ? (
              <span className="proof-yes">📸 Proof attached</span>
            ) : (
              <span className="proof-no">📷 No proof attached</span>
            )
          ) : null}
        </div>
      </button>

      <div className="report-card-actions">
        {report.status === "not-started" ? (
          <button className="btn btn-sm btn-ghost" onClick={onMarkInProgress}>
            Start
          </button>
        ) : null}
        {!isSubmitted ? (
          <button className="btn btn-sm btn-primary" onClick={onSubmit}>
            Mark submitted
          </button>
        ) : null}
        <button className="btn btn-sm btn-ghost" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  );
}
