import { useState } from "react";
import { Modal } from "./Modal";
import type { Absentee, AbsenceStatus, AbsenceType, NewAbsenteeInput } from "../types";
import { todayIso } from "../lib/dates";

interface AddAbsenteeModalProps {
  initial?: Absentee;
  onSave: (input: NewAbsenteeInput) => void;
  onClose: () => void;
}

const TYPES: AbsenceType[] = [
  "Sick Leave",
  "Vacation Leave",
  "Emergency Leave",
  "Undertime",
  "AWOL",
  "Other",
];

const STATUSES: { id: AbsenceStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "unapproved", label: "Unapproved" },
];

export function AddAbsenteeModal({ initial, onSave, onClose }: AddAbsenteeModalProps) {
  const [employeeName, setEmployeeName] = useState(initial?.employeeName ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [type, setType] = useState<AbsenceType>(initial?.type ?? "Sick Leave");
  const [status, setStatus] = useState<AbsenceStatus>(initial?.status ?? "pending");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");

  const canSave = employeeName.trim().length > 0 && date.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({ employeeName, department, date, type, status, remarks });
  }

  return (
    <Modal
      title={initial ? "Edit absence record" : "Log absence"}
      subtitle="Track who's out, why, and whether it's been approved."
      onClose={onClose}
      width={520}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-2">
            <label htmlFor="af-name">Employee name</label>
            <input
              id="af-name"
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="af-dept">Department</label>
            <input
              id="af-dept"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. QMS"
            />
          </div>

          <div className="field">
            <label htmlFor="af-date">Date</label>
            <input
              id="af-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="af-type">Type</label>
            <select
              id="af-type"
              value={type}
              onChange={(e) => setType(e.target.value as AbsenceType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="af-status">Status</label>
            <select
              id="af-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AbsenceStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field span-2">
            <label htmlFor="af-remarks">Remarks</label>
            <textarea
              id="af-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            {initial ? "Save changes" : "Log absence"}
          </button>
        </div>
      </form>
    </Modal>
  );
}   