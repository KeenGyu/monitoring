import { useMemo, useState } from "react";
import type { NewGoalInput, SavingsGoal, SavingsTransaction } from "../types.salary";
import { computeGoalProgress, computeGoalProjection } from "../lib/salaryCalc";
import { formatDate, formatDateShort } from "../lib/dates";
import { GoalFormModal } from "./GoalFormModal";
import "./SavingsDetails.css";

function peso(n: number): string {
  return `\u20b1${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface SavingsDetailsProps {
  goals: SavingsGoal[];
  transactions: SavingsTransaction[];
  onAddGoal: (input: NewGoalInput) => void;
  onEditGoal: (id: string, input: NewGoalInput) => void;
  onArchiveGoal: (id: string) => void;
  onDeleteGoal: (id: string) => void;
  onDeleteAllocation: (id: string) => void;
}

export function SavingsDetails({
  goals,
  transactions,
  onAddGoal,
  onEditGoal,
  onArchiveGoal,
  onDeleteGoal,
  onDeleteAllocation,
}: SavingsDetailsProps) {
  const [formGoal, setFormGoal] = useState<SavingsGoal | "new" | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");
  const archived = goals.filter((g) => g.status === "archived");

  const totalSaved = useMemo(
    () => goals.reduce((sum, g) => sum + g.currentAmount, 0),
    [goals]
  );

  const history = useMemo(() => {
    const goalName = new Map(goals.map((g) => [g.id, g.name]));
    const sorted = [...transactions].sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
    );
    const map = new Map<string, { txn: SavingsTransaction; goalName: string }[]>();
    for (const txn of sorted) {
      const list = map.get(txn.date) ?? [];
      list.push({ txn, goalName: goalName.get(txn.goalId) ?? "Deleted goal" });
      map.set(txn.date, list);
    }
    return Array.from(map.entries());
  }, [transactions, goals]);

  function goalTxns(goalId: string) {
    return transactions.filter((t) => t.goalId === goalId);
  }

  function renderGoalCard(goal: SavingsGoal) {
    const progress = computeGoalProgress(goal);
    const projection = computeGoalProjection(goal, goalTxns(goal.id));
    const isCompleted = goal.status === "completed";

    return (
      <div className={`card goal-card ${isCompleted ? "goal-completed" : ""}`} key={goal.id}>
        <div className="goal-card-head">
          <div>
            <div className="goal-card-name">
              {isCompleted && <span className="goal-celebration">🎉</span>}
              {goal.name}
            </div>
            <div className="goal-card-category">{goal.category}</div>
          </div>
          <div className="goal-card-percent">{progress.percent.toFixed(0)}%</div>
        </div>

        <div className="goal-progress-bar">
          <div className="goal-progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>

        <div className="goal-card-amounts">
          <span>{peso(goal.currentAmount)}</span>
          <span className="goal-card-target">/ {peso(goal.targetAmount)}</span>
        </div>

        {isCompleted ? (
          <p className="salary-note goal-celebration-note">
            Goal acquired. Money successfully escaped the spending budget.
          </p>
        ) : (
          <>
            <p className="salary-note">{peso(progress.remaining)} remaining</p>
            {goal.targetDate && (
              <p className="salary-note">Target date: {formatDate(goal.targetDate)}</p>
            )}
            {projection.hasEstimate ? (
              <p className="salary-note">
                At {peso(projection.avgPerAllocation)} per allocation ≈ {projection.payoutsNeeded} more
                {projection.payoutsNeeded === 1 ? " time" : " times"} · estimated{" "}
                {formatDate(projection.estimatedCompletionDate)}
              </p>
            ) : (
              <p className="salary-note">Not enough savings history for an estimate.</p>
            )}
          </>
        )}

        {goal.status !== "archived" && (
          <div className="salary-modal-actions goal-card-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setFormGoal(goal)}>
              Edit
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onArchiveGoal(goal.id)}>
              Archive
            </button>
            <button className="salary-inline-btn salary-inline-btn-danger" onClick={() => onDeleteGoal(goal.id)}>
              delete
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="savings-details">
      <div className="savings-details-header">
        <div>
          <div className="salary-savings-label">Total saved</div>
          <div className="savings-total-amount">{peso(totalSaved)}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setFormGoal("new")}>
          + Add goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="card spending-empty">
          <p>No savings goals yet.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setFormGoal("new")}>
            + Create your first goal
          </button>
        </div>
      ) : (
        <>
          <div className="goals-grid">
            {active.map(renderGoalCard)}
            {completed.map(renderGoalCard)}
          </div>

          {archived.length > 0 && (
            <div className="archived-section">
              <button className="salary-inline-btn" onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? "Hide" : "Show"} archived goals ({archived.length})
              </button>
              {showArchived && <div className="goals-grid">{archived.map(renderGoalCard)}</div>}
            </div>
          )}
        </>
      )}

      <h3 className="savings-history-title">Savings history</h3>
      {history.length === 0 ? (
        <div className="card spending-empty">
          <p>No allocations logged yet.</p>
        </div>
      ) : (
        <div className="spending-groups">
          {history.map(([date, items]) => (
            <div className="spending-group" key={date}>
              <div className="spending-group-date">{formatDateShort(date)}</div>
              <div className="card spending-group-card">
                {items.map(({ txn, goalName }) => (
                  <div className="spending-row" key={txn.id}>
                    <span className="spending-row-desc">
                      {goalName}
                      {txn.note ? ` · ${txn.note}` : ""}
                    </span>
                    <span className="spending-row-amount">{peso(txn.amount)}</span>
                    <span className="spending-row-actions">
                      <button
                        className="salary-inline-btn salary-inline-btn-danger"
                        onClick={() => onDeleteAllocation(txn.id)}
                      >
                        remove
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {formGoal && (
        <GoalFormModal
          initial={formGoal === "new" ? undefined : formGoal}
          onClose={() => setFormGoal(null)}
          onSave={(input) => {
            if (formGoal === "new") {
              onAddGoal(input);
            } else {
              onEditGoal(formGoal.id, input);
            }
            setFormGoal(null);
          }}
        />
      )}
    </div>
  );
}