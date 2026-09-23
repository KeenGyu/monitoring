import { useState } from "react";
import type { GoalCategory, NewGoalInput, SavingsGoal } from "../types.salary";

const CATEGORIES: GoalCategory[] = [
  "Emergency Fund",
  "Laptop",
  "Phone",
  "Travel",
  "Investment",
  "Personal",
  "Other",
];

interface GoalFormModalProps {
  initial?: SavingsGoal;
  onSave: (input: NewGoalInput) => void;
  onClose: () => void;
}

export function GoalFormModal({ initial, onSave, onClose }: GoalFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<GoalCategory>(initial?.category ?? "Emergency Fund");
  const [targetAmount, setTargetAmount] = useState(initial ? String(initial.targetAmount) : "");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");

  const amount = Number(targetAmount);
  const canSave = name.trim().length > 0 && Number.isFinite(amount) && amount > 0;

  function save() {
    if (!canSave) return;
    onSave({ name, category, targetAmount: amount, targetDate: targetDate || null });
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="card salary-expense-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{initial ? "Edit goal" : "New savings goal"}</h3>
        <div className="field">
          <label>Goal name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency Fund"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Target amount</label>
          <input
            type="text"
            inputMode="decimal"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="10000"
          />
        </div>
        <div className="field">
          <label>Target date (optional)</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <p className="salary-note">
            Shown separately from the estimated completion date, which is calculated from your
            actual saving pace once there's enough history.
          </p>
        </div>
        <div className="salary-modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!canSave} onClick={save}>
            {initial ? "Save changes" : "Create goal"}
          </button>
        </div>
      </div>
    </div>
  );
}