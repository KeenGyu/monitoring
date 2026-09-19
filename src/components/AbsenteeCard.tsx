import type { Absentee } from "../types";
import { formatDate, formatMinutes } from "../lib/dates";
import "./AbsenteeCard.css";

interface AbsenteeCardProps {
  absentee: Absentee;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_CLASS: Record<Absentee["status"], string> = {
  pending: "status-progress",
  approved: "status-submitted",
  unapproved: "status-overdue",
};

const STATUS_LABEL: Record<Absentee["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  unapproved: "Unapproved",
};

export function AbsenteeCard({ absentee, onEdit, onDelete }: AbsenteeCardProps) {
  return (
    <div className={`absentee-card border-${absentee.status}`}>
      <div className="absentee-card-top">
        <div>
          <div className="absentee-card-name">{absentee.employeeName}</div>
          {absentee.department ? (
            <div className="absentee-card-dept">{absentee.department}</div>
          ) : null}
        </div>
        <span className={`status-badge ${STATUS_CLASS[absentee.status]}`}>
          <span className="status-dot" />
          {STATUS_LABEL[absentee.status]}
        </span>
      </div>

      <div className="absentee-card-meta">
        <span className="absentee-type-pill">{absentee.type}</span>
        <span>{formatDate(absentee.date)}</span>
        {absentee.minutes ? <span>{formatMinutes(absentee.minutes)}</span> : null}
        {absentee.deductFromSalary ? <span>· deducted from salary</span> : null}
      </div>

      {absentee.remarks ? (
        <p className="absentee-card-remarks">{absentee.remarks}</p>
      ) : null}

      <div className="absentee-card-actions">
        <button className="btn btn-sm btn-ghost" onClick={onEdit}>
          Edit
        </button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}