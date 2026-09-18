import { useState } from "react";
import { Modal } from "./Modal";
import { ImagePickerField } from "./ImagePickerField";
import type { Report, SubmissionInput } from "../types";

interface SubmitModalProps {
  report: Report;
  onSubmit: (input: SubmissionInput) => void;
  onClose: () => void;
}

function nowParts() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5);
  return { date, time };
}

export function SubmitModal({ report, onSubmit, onClose }: SubmitModalProps) {
  const { date: initialDate, time: initialTime } = nowParts();
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [supervisor, setSupervisor] = useState(report.supervisor);
  const [notes, setNotes] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(report.proofImage);

  const missingRequiredProof = report.proofRequired && !proofImage;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missingRequiredProof) return;
    const submittedAt = new Date(`${date}T${time || "00:00"}:00`).toISOString();
    onSubmit({ submittedAt, supervisor, submissionNotes: notes, proofImage });
  }

  return (
    <Modal
      title={`Mark "${report.name}" submitted`}
      subtitle="Record when it went out and attach proof if you have it."
      onClose={onClose}
      width={520}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="sf-date">Submission date</label>
            <input
              id="sf-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="sf-time">Submission time</label>
            <input
              id="sf-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="field span-2">
            <label htmlFor="sf-sup">Supervisor</label>
            <input
              id="sf-sup"
              type="text"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              placeholder="Who received this"
            />
          </div>
          <div className="field span-2">
            <label htmlFor="sf-notes">Notes</label>
            <textarea
              id="sf-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context about this submission"
            />
          </div>
          <div className="span-2">
            <ImagePickerField
              label={
                report.proofRequired ? "Proof of submission (required)" : "Proof of submission"
              }
              value={proofImage}
              onChange={setProofImage}
            />
            {missingRequiredProof ? (
              <p style={{ color: "var(--status-overdue)", fontSize: 12.5, marginTop: 6 }}>
                This report requires proof before it can be marked submitted.
              </p>
            ) : null}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={missingRequiredProof}>
            Confirm submission
          </button>
        </div>
      </form>
    </Modal>
  );
}
