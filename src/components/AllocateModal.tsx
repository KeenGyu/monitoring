import { useState } from "react";
import type { NewAllocationInput, SavingsGoal } from "../types.salary";

function peso(n: number): string {
  return `\u20b1${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface AllocateModalProps {
  netPay: number;
  alreadyAllocated: number;
  payPeriodDate: string;
  goals: SavingsGoal[];
  defaultAmount: number;
  onSave: (input: NewAllocationInput) => void;
  onClose: () => void;
  onCreateGoal: () => void;
}

export function AllocateModal({
  netPay,
  alreadyAllocated,
  payPeriodDate,
  goals,
  defaultAmount,
  onSave,
  onClose,
  onCreateGoal,
}: AllocateModalProps) {
  const activeGoals = goals.filter((g) => g.status === "active");
  const availableBefore = Math.max(0, netPay - alreadyAllocated);

  const [goalId, setGoalId] = useState(activeGoals[0]?.id ?? "");
  const [amountText, setAmountText] = useState(
    String(Math.min(defaultAmount, availableBefore) || "")
  );
  const [note, setNote] = useState("");

  const amount = Number(amountText);
  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= availableBefore;
  const canSave = validAmount && goalId.length > 0;
  const remainingAfter = availableBefore - (Number.isFinite(amount) ? Math.max(0, amount) : 0);

  function save() {
    if (!canSave) return;
    onSave({ goalId, amount, note, payPeriodDate });
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="card salary-expense-modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>Allocate payout</h3>

        <div className="allocate-summary">
          <div className="salary-row">
            <span>Current net pay</span>
            <span>{peso(netPay)}</span>
          </div>
          {alreadyAllocated > 0 && (
            <div className="salary-row salary-deduction">
              <span>Already allocated</span>
              <span>−{peso(alreadyAllocated)}</span>
            </div>
          )}
          <div className="salary-row salary-total">
            <span>Available to allocate</span>
            <span>{peso(availableBefore)}</span>
          </div>
        </div>

        {activeGoals.length === 0 ? (
          <div className="allocate-no-goals">
            <p className="salary-note">You don't have a savings goal yet.</p>
            <button className="btn btn-primary btn-sm" onClick={onCreateGoal}>
              + Create your first goal
            </button>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Amount to save</label>
              <input
                type="text"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              {!validAmount && amountText.trim() !== "" && (
                <p className="salary-note salary-note-warn">
                  {amount > availableBefore
                    ? `Can't allocate more than ${peso(availableBefore)} available.`
                    : "Enter an amount greater than zero."}
                </p>
              )}
            </div>

            <div className="field">
              <label>Savings goal</label>
              <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                {activeGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. from this payout"
              />
            </div>

            <div className="salary-row salary-total">
              <span>Remaining available to spend</span>
              <span>{peso(Math.max(0, remainingAfter))}</span>
            </div>

            <div className="salary-modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!canSave} onClick={save}>
                Save allocation
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}