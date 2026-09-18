import { useState } from "react";
import { Modal } from "./Modal";
import { ImagePickerField } from "./ImagePickerField";
import type { NewReportInput, Report } from "../types";

interface AddReportModalProps {
  initial?: Report;
  onSave: (input: NewReportInput) => void;
  onClose: () => void;
}

export function AddReportModal({ initial, onSave, onClose }: AddReportModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [monitoringStart, setMonitoringStart] = useState(
    initial?.monitoringStart ?? ""
  );
  const [monitoringEnd, setMonitoringEnd] = useState(initial?.monitoringEnd ?? "");
  const [supervisor, setSupervisor] = useState(initial?.supervisor ?? "");
  const [proofRequired, setProofRequired] = useState(initial?.proofRequired ?? false);
  const [funnyReactionImage, setFunnyReactionImage] = useState<string | null>(
    initial?.funnyReactionImage ?? null
  );

  const canSave = name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      name,
      category,
      description,
      dueDate: dueDate || null,
      monitoringStart: monitoringStart || null,
      monitoringEnd: monitoringEnd || null,
      supervisor,
      proofRequired,
      funnyReactionImage,
    });
  }

  return (
    <Modal
      title={initial ? "Edit report" : "Add report"}
      subtitle="Only a name is required — fill in the rest whenever it's useful."
      onClose={onClose}
      width={560}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-2">
            <label htmlFor="rf-name">Report name</label>
            <input
              id="rf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AOD"
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="rf-category">Category</label>
            <input
              id="rf-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Daily"
            />
          </div>

          <div className="field">
            <label htmlFor="rf-due">Due date</label>
            <input
              id="rf-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="field span-2">
            <label htmlFor="rf-desc">Description</label>
            <textarea
              id="rf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about what this report covers"
            />
          </div>

          <div className="field">
            <label htmlFor="rf-mstart">Monitoring start</label>
            <input
              id="rf-mstart"
              type="date"
              value={monitoringStart}
              onChange={(e) => setMonitoringStart(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="rf-mend">Monitoring end</label>
            <input
              id="rf-mend"
              type="date"
              value={monitoringEnd}
              onChange={(e) => setMonitoringEnd(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="rf-sup">Supervisor</label>
            <input
              id="rf-sup"
              type="text"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              placeholder="Who this gets submitted to"
            />
          </div>

          <div className="field" style={{ justifyContent: "center" }}>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={proofRequired}
                onChange={(e) => setProofRequired(e.target.checked)}
              />
              Proof required before submitting
            </label>
          </div>

          <div className="span-2">
            <ImagePickerField
              label="Funny reaction image (optional)"
              value={funnyReactionImage}
              onChange={setFunnyReactionImage}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            {initial ? "Save changes" : "Add report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
