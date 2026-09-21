import type { SavingsSummary } from "../types.salary";
import { formatDate, formatDateShort } from "../lib/dates";
import "./SavingsCard.css";

function peso(n: number): string {
  return `\u20b1${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface SavingsCardProps {
  summary: SavingsSummary | null;
  firstPayoutDate: string | null;
}

export function SavingsCard({ summary, firstPayoutDate }: SavingsCardProps) {
  if (!summary) {
    return (
      <div className="card savings-card">
        <h2 className="section-title">Savings goal</h2>
        <p className="savings-note">
          Tracking starts on your first payout{firstPayoutDate ? ` (${formatDate(firstPayoutDate)})` : ""}.
          Spending dated before then isn't counted against any payout.
        </p>
      </div>
    );
  }

  const total = summary.budget + summary.goal;
  const spentInBudget = Math.min(summary.spent, summary.budget);
  const budgetPct = total > 0 ? (spentInBudget / total) * 100 : 0;
  const touchedPct = total > 0 ? (summary.goalTouched / total) * 100 : 0;
  const touched = summary.goalTouched > 0;

  return (
    <div className={`card savings-card ${touched ? "touched" : ""}`}>
      <div className="savings-head">
        <div>
          <h2 className="section-title">Savings goal</h2>
          <p className="savings-note">
            Payout {formatDateShort(summary.windowStart)} → next payout {formatDateShort(summary.windowEnd)} ·{" "}
            {summary.daysLeft} {summary.daysLeft === 1 ? "day" : "days"} left
          </p>
        </div>
        <div className="savings-goal-left">
          <div className="savings-goal-value">{peso(summary.goalRemaining)}</div>
          <div className="savings-goal-label">of {peso(summary.goal)} goal left</div>
        </div>
      </div>

      <div className="savings-bar" role="img" aria-label="Spending against payout">
        <div className="savings-bar-spent" style={{ width: `${budgetPct}%` }} />
        <div className="savings-bar-touched" style={{ width: `${touchedPct}%` }} />
      </div>
      <div className="savings-bar-legend">
        <span><i className="savings-dot spent" /> Spent from budget</span>
        <span><i className="savings-dot touched" /> Taken from savings goal</span>
      </div>

      <div className="savings-grid">
        <div>
          <div className="savings-label">Net pay</div>
          <div className="savings-value">{peso(summary.netPay)}</div>
        </div>
        <div>
          <div className="savings-label">Spent (from log)</div>
          <div className="savings-value">{peso(summary.spent)}</div>
        </div>
        <div>
          <div className="savings-label">Budget left</div>
          <div className="savings-value">{peso(Math.max(0, summary.budget - summary.spent))}</div>
        </div>
        <div>
          <div className="savings-label">Daily pace</div>
          <div className="savings-value">
            {summary.paceDailyBudget === null ? "—" : peso(summary.paceDailyBudget)}
          </div>
        </div>
      </div>

      {touched && (
        <p className="savings-warning">
          You've spent {peso(summary.goalTouched)} of your {peso(summary.goal)} savings goal.
          {summary.overspent > 0 ? ` You're also ${peso(summary.overspent)} beyond this whole payout.` : ""}
        </p>
      )}
    </div>
  );
}