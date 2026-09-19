import { useState } from "react";
import { Modal } from "./Modal";

interface EditProfileModalProps {
  initialName: string;
  initialRole: string;
  onSave: (name: string, role: string) => void;
  onClose: () => void;
}

export function EditProfileModal({
  initialName,
  initialRole,
  onSave,
  onClose,
}: EditProfileModalProps) {
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState(initialRole);

  const canSave = name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave(name, role);
  }

  return (
    <Modal
      title="Edit profile"
      subtitle="This is shown in the sidebar — update it if someone else is using this device."
      onClose={onClose}
      width={420}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-2">
            <label htmlFor="pf-name">Name</label>
            <input
              id="pf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              autoFocus
            />
          </div>

          <div className="field span-2">
            <label htmlFor="pf-role">Position</label>
            <input
              id="pf-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. QMS Staff"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}