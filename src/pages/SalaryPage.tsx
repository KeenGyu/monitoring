import { useMemo, useState } from "react";
import { useSalary } from "../store.salary";
import { useApp } from "../store";
import {
  buildMonthPeriods,
  buildSavingsSummary,
  computeGoalProgress,
  currentPayPeriodId,
  currentSpendingPeriodId,
  rateForDate,
} from "../lib/salaryCalc";
import {
  formatDate,
  formatDateShort,
  formatMinutes,
  todayIso,
  currentMonthKey,
  addMonths,
  monthLabel,
} from "../lib/dates";
import type { PayPeriod, SavingsGoal } from "../types.salary";
import { SpendingLog } from "../components/SpendingLog";
import { SavingsDetails } from "../components/SavingsDetails";
import { AllocateModal } from "../components/AllocateModal";
import { GoalFormModal } from "../components/GoalFormModal";
import "./SalaryPage.css";

function peso(n: number): string {
  return `\u20b1${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cutoffLabel(period: PayPeriod): string {
  return period.cutoff === "first" ? "1st cutoff" : "2nd cutoff";
}

const STATUS_LABEL: Record<"on-track" | "watch" | "over-budget", string> = {
  "on-track": "On track",
  watch: "Watch your spending",
  "over-budget": "Over budget",
};

type SalaryTab = "overview" | "spending" | "savings";

export function SalaryPage() {
  const {
    loading,
    config,
    expenses,
    spending,
    goals,
    transactions,
    updateConfig,
    addExpense,
    editExpense,
    deleteExpense,
    addSpending,
    editSpending,
    deleteSpending,
    addGoal,
    editGoal,
    archiveGoal,
    deleteGoal,
    allocate,
    deleteAllocation,
  } = useSalary();
  const { absentees } = useApp();
  const [tab, setTab] = useState<SalaryTab>("overview");
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [showSettings, setShowSettings] = useState(false);
  const [expenseForm, setExpenseForm] = useState<{ payPeriodDate: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [allocateFor, setAllocateFor] = useState<{ netPay: number; alreadyAllocated: number; payPeriodDate: string } | null>(
    null
  );
  const [quickNewGoal, setQuickNewGoal] = useState(false);

  const periods = useMemo(
    () => (loading ? [] : buildMonthPeriods(monthKey, config, expenses, absentees)),
    [monthKey, config, expenses, absentees, loading]
  );

  const activePeriodId = currentPayPeriodId(todayIso());
  const activeSpendingPeriodId = loading
    ? null
    : currentSpendingPeriodId(todayIso(), config, expenses, absentees);

  // The goal to feature on the compact payout card: whichever active goal
  // was allocated to most recently, falling back to the most recently
  // created active goal. Every other goal is still reachable via "View
  // Savings" — this just keeps the per-payout card from getting crowded.
  const primaryGoal: SavingsGoal | null = useMemo(() => {
    const activeGoals = goals.filter((g) => g.status === "active");
    if (activeGoals.length === 0) return null;
    const lastTxnByGoal = new Map<string, string>();
    for (const t of transactions) {
      const prev = lastTxnByGoal.get(t.goalId);
      if (!prev || t.createdAt > prev) lastTxnByGoal.set(t.goalId, t.createdAt);
    }
    const withActivity = activeGoals.filter((g) => lastTxnByGoal.has(g.id));
    if (withActivity.length > 0) {
      return withActivity.sort(
        (a, b) => (lastTxnByGoal.get(b.id) ?? "").localeCompare(lastTxnByGoal.get(a.id) ?? "")
      )[0];
    }
    return [...activeGoals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }, [goals, transactions]);

  if (loading) {
    return <div className="page">Loading salary data…</div>;
  }

  function openAddExpense(payPeriodDate: string) {
    setEditingId(null);
    setFormDesc("");
    setFormAmount("");
    setExpenseForm({ payPeriodDate });
  }

  function openEditExpense(period: PayPeriod, id: string) {
    const e = period.expenses.find((x) => x.id === id);
    if (!e) return;
    setEditingId(id);
    setFormDesc(e.description);
    setFormAmount(String(e.amount));
    setExpenseForm({ payPeriodDate: e.payPeriodDate });
  }

  function saveExpense() {
    if (!expenseForm) return;
    const amount = Number(formAmount);
    if (!formDesc.trim() || !Number.isFinite(amount) || amount <= 0) return;
    if (editingId) {
      editExpense(editingId, {
        description: formDesc.trim(),
        amount,
        payPeriodDate: expenseForm.payPeriodDate,
      });
    } else {
      addExpense({ description: formDesc.trim(), amount, payPeriodDate: expenseForm.payPeriodDate });
    }
    setExpenseForm(null);
    setEditingId(null);
  }

  return (
    <div className="page salary-page">
      <div className="salary-header">
        <div>
          <h1>Salary Tracker</h1>
          <p className="salary-subtitle">
            {peso(rateForDate(todayIso(), config))} / day · {config.employmentStatus} · every day except{" "}
            {config.restDays.includes(0) ? "Sunday" : "your rest day"}
          </p>
        </div>
        <button className="btn" onClick={() => setShowSettings((v) => !v)}>
          ⚙ Settings
        </button>
      </div>

      <div className="filter-row salary-tabs" role="tablist" aria-label="Salary view">
        <button
          className={`filter-chip ${tab === "overview" ? "active" : ""}`}
          onClick={() => setTab("overview")}
          role="tab"
          aria-selected={tab === "overview"}
        >
          Overview
        </button>
        <button
          className={`filter-chip ${tab === "spending" ? "active" : ""}`}
          onClick={() => setTab("spending")}
          role="tab"
          aria-selected={tab === "spending"}
        >
          Spending log{spending.length > 0 ? ` (${spending.length})` : ""}
        </button>
        <button
          className={`filter-chip ${tab === "savings" ? "active" : ""}`}
          onClick={() => setTab("savings")}
          role="tab"
          aria-selected={tab === "savings"}
        >
          Savings{goals.length > 0 ? ` (${goals.length})` : ""}
        </button>
      </div>

      {tab === "savings" ? (
        <SavingsDetails
          goals={goals}
          transactions={transactions}
          onAddGoal={addGoal}
          onEditGoal={editGoal}
          onArchiveGoal={archiveGoal}
          onDeleteGoal={deleteGoal}
          onDeleteAllocation={deleteAllocation}
        />
      ) : tab === "spending" ? (
        <SpendingLog
          entries={spending}
          onAdd={addSpending}
          onEdit={editSpending}
          onDelete={deleteSpending}
        />
      ) : (
        <>
          {showSettings && (
            <div className="card salary-settings">
              <div className="field">
                <label>Employment status</label>
                <select
                  value={config.employmentStatus}
                  onChange={(e) =>
                    updateConfig({ employmentStatus: e.target.value as typeof config.employmentStatus })
                  }
                >
                  <option value="probationary">Probationary</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
              <div className="field">
                <label>Probationary daily rate</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={config.probationaryRate}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) updateConfig({ probationaryRate: v });
                  }}
                />
              </div>
              <div className="field">
                <label>Regular daily rate</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={config.regularRate}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) updateConfig({ regularRate: v });
                  }}
                />
              </div>
              {config.employmentStatus === "regular" && (
                <div className="field">
                  <label>Regularized on (optional)</label>
                  <input
                    type="date"
                    value={config.regularizedOn ?? ""}
                    onChange={(e) => updateConfig({ regularizedOn: e.target.value || null })}
                  />
                  <p className="salary-note">Days before this date are paid at the probationary rate.</p>
                </div>
              )}
              <div className="field">
                <label>Working hours per day</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={config.hoursPerDay}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0) updateConfig({ hoursPerDay: v });
                  }}
                />
              </div>
              <div className="field">
                <label>First payout date</label>
                <input
                  type="date"
                  value={config.firstPayoutDate ?? ""}
                  onChange={(e) => updateConfig({ firstPayoutDate: e.target.value || null })}
                />
                <p className="salary-note">Cutoffs paid before this date show no salary.</p>
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={config.deductAttendance}
                  onChange={(e) => updateConfig({ deductAttendance: e.target.checked })}
                />
                Auto-deduct late, half-day and undertime
              </label>

              <div className="salary-deduction-toggles">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={config.deductSss}
                    onChange={(e) => updateConfig({ deductSss: e.target.checked })}
                  />
                  Deduct SSS
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={config.deductPhilHealth}
                    onChange={(e) => updateConfig({ deductPhilHealth: e.target.checked })}
                  />
                  Deduct PhilHealth
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={config.deductPagIbig}
                    onChange={(e) => updateConfig({ deductPagIbig: e.target.checked })}
                  />
                  Deduct Pag-IBIG
                </label>
              </div>

              <div className="field">
                <label>How to calculate SSS / PhilHealth / Pag-IBIG</label>
                <select
                  value={config.deductionMode}
                  onChange={(e) => updateConfig({ deductionMode: e.target.value as typeof config.deductionMode })}
                >
                  <option value="manual">Use my actual payslip amounts</option>
                  <option value="computed">Estimate with standard formulas</option>
                </select>
              </div>

              {config.deductionMode === "manual" ? (
                <div className="salary-manual-amounts">
                  <div className="field">
                    <label>SSS per cutoff</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={config.manualSss}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) updateConfig({ manualSss: v });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>PhilHealth per cutoff</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={config.manualPhilHealth}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) updateConfig({ manualPhilHealth: v });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Pag-IBIG per cutoff</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={config.manualPagIbig}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) updateConfig({ manualPagIbig: v });
                      }}
                    />
                  </div>
                  <p className="salary-note">
                    These amounts are deducted every cutoff, taken straight from your payslip — good
                    for when your employer doesn't use the capped statutory formulas.
                  </p>
                </div>
              ) : (
                <>
                  <div className="field">
                    <label>How contributions split across the two payouts</label>
                    <select
                      value={config.contributionSplit}
                      onChange={(e) =>
                        updateConfig({ contributionSplit: e.target.value as typeof config.contributionSplit })
                      }
                    >
                      <option value="even">Half on each payout</option>
                      <option value="first">All on the 15th payout</option>
                      <option value="second">All on the 30th payout</option>
                    </select>
                  </div>
                  <p className="salary-note">
                    SSS, PhilHealth and Pag-IBIG are estimated using the standard 2026 employee-share
                    formulas (SSS 5% of Monthly Salary Credit, PhilHealth 2.5% of basic salary,
                    Pag-IBIG 2% of Monthly Fund Salary capped at ₱200). Most employers deduct
                    differently from this, so "my actual payslip amounts" is usually more accurate.
                  </p>
                </>
              )}

              <div className="field">
                <label>Default savings amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={config.defaultAllocationAmount}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 0) updateConfig({ defaultAllocationAmount: v });
                  }}
                />
                <p className="salary-note">
                  Pre-fills the amount when you open "Allocate Money" — you can always change it per
                  payout. Nothing is set aside automatically.
                </p>
              </div>
            </div>
          )}

          <div className="salary-month-nav">
            <button className="btn btn-ghost btn-sm" onClick={() => setMonthKey(addMonths(monthKey, -1))}>
              ‹ Prev
            </button>
            <div className="salary-month-label">{monthLabel(monthKey)}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setMonthKey(addMonths(monthKey, 1))}>
              Next ›
            </button>
          </div>

          <div className="salary-periods">
            {periods.map((period) => {
              const savings = period.beforeFirstPayout
                ? null
                : buildSavingsSummary(period, spending, transactions, todayIso());
              const isSpendingNow = period.id === activeSpendingPeriodId;

              return (
                <div
                  key={period.id}
                  className={`card salary-period ${period.id === activePeriodId ? "current" : ""}`}
                >
                  <div className="salary-period-head">
                    <div>
                      <div className="salary-period-title">
                        {cutoffLabel(period)}
                        {period.id === activePeriodId && <span className="salary-badge">Current</span>}
                      </div>
                      <div className="salary-period-range">
                        {formatDate(period.periodStart)} – {formatDate(period.periodEnd)} · paid{" "}
                        {formatDate(period.payDate)}
                      </div>
                    </div>
                    <div className="salary-net">{period.beforeFirstPayout ? "—" : peso(period.netPay)}</div>
                  </div>

                  {period.beforeFirstPayout ? (
                    <p className="salary-note">
                      No salary for this cutoff. Your first payout is {formatDate(config.firstPayoutDate)}.
                    </p>
                  ) : (
                    <>
                      <div className="salary-breakdown">
                        <div className="salary-row">
                          <span>Days worked</span>
                          <span>{period.workDays}</span>
                        </div>
                        <div className="salary-row">
                          <span>Gross pay</span>
                          <span>{peso(period.grossPay)}</span>
                        </div>
                        {config.deductSss && (
                          <div className="salary-row salary-deduction">
                            <span>SSS</span>
                            <span>−{peso(period.sss)}</span>
                          </div>
                        )}
                        {config.deductPhilHealth && (
                          <div className="salary-row salary-deduction">
                            <span>PhilHealth</span>
                            <span>−{peso(period.philHealth)}</span>
                          </div>
                        )}
                        {config.deductPagIbig && (
                          <div className="salary-row salary-deduction">
                            <span>Pag-IBIG</span>
                            <span>−{peso(period.pagIbig)}</span>
                          </div>
                        )}
                        {period.attendanceDeductions.map((d) => (
                          <div className="salary-row salary-deduction" key={d.id}>
                            <span>
                              {d.type} · {formatDateShort(d.date)}
                              {d.type !== "Half-day" && d.minutes ? ` · ${formatMinutes(d.minutes)}` : ""}
                            </span>
                            <span>−{peso(d.amount)}</span>
                          </div>
                        ))}
                        {period.expenses.map((e) => (
                          <div className="salary-row salary-deduction salary-expense-row" key={e.id}>
                            <span>
                              {e.description}
                              <button className="salary-inline-btn" onClick={() => openEditExpense(period, e.id)}>
                                edit
                              </button>
                              <button
                                className="salary-inline-btn salary-inline-btn-danger"
                                onClick={() => deleteExpense(e.id)}
                              >
                                remove
                              </button>
                            </span>
                            <span>−{peso(e.amount)}</span>
                          </div>
                        ))}
                        <div className="salary-row salary-total">
                          <span>Net pay</span>
                          <span>{peso(period.netPay)}</span>
                        </div>
                      </div>

                      <button
                        className="btn btn-sm btn-ghost salary-add-expense"
                        onClick={() => openAddExpense(period.payDate)}
                      >
                        + Add expense to this payout
                      </button>

                      {savings && (
                        <div className={`salary-savings ${isSpendingNow ? "live" : ""}`}>
                          {primaryGoal && (
                            <div className="savings-goal-strip">
                              <div>
                                <div className="savings-goal-strip-name">{primaryGoal.name}</div>
                                <div className="savings-goal-strip-sub">
                                  {peso(primaryGoal.currentAmount)} / {peso(primaryGoal.targetAmount)}
                                </div>
                              </div>
                              <div className="savings-goal-strip-percent">
                                {computeGoalProgress(primaryGoal).percent.toFixed(0)}%
                              </div>
                            </div>
                          )}

                          <div className="savings-section-label">This payout</div>
                          <div className="salary-row">
                            <span>Net pay</span>
                            <span>{peso(savings.netPay)}</span>
                          </div>
                          <div className="salary-row salary-deduction">
                            <span>Planned savings</span>
                            <span>−{peso(savings.plannedSavings)}</span>
                          </div>
                          <div className="salary-row salary-total">
                            <span>Available to spend</span>
                            <span>{peso(savings.availableToSpend)}</span>
                          </div>
                          <div className="salary-row">
                            <span>Savings rate</span>
                            <span>{savings.savingsRate.toFixed(1)}%</span>
                          </div>

                          <div className="savings-section-label">
                            Spending window
                            {isSpendingNow && <span className="salary-badge salary-badge-live">Now</span>}
                          </div>
                          <div className="salary-row">
                            <span>Window</span>
                            <span>
                              {formatDateShort(savings.windowStart)} – {formatDateShort(savings.windowEnd)}{" "}
                              ({savings.totalDays}d)
                            </span>
                          </div>
                          <div className="salary-row">
                            <span>{savings.hasEnded ? "Window closed" : `${savings.daysLeft}d remaining`}</span>
                            <span>{peso(savings.spent)} spent</span>
                          </div>

                          <div className="salary-savings-bar">
                            <div
                              className="salary-savings-bar-fill"
                              style={{
                                width: `${Math.min(
                                  100,
                                  savings.availableToSpend > 0
                                    ? (savings.spent / savings.availableToSpend) * 100
                                    : 0
                                )}%`,
                              }}
                            />
                          </div>

                          <div className="salary-row salary-total">
                            <span>Safe to spend</span>
                            <span>
                              {savings.safeToSpendPerDay !== null
                                ? `${peso(savings.safeToSpendPerDay)}/day`
                                : "—"}
                            </span>
                          </div>

                          {savings.hasStarted && (
                            <span className={`savings-status-badge ${savings.status}`}>
                              {STATUS_LABEL[savings.status]}
                            </span>
                          )}

                          {savings.entries.length > 0 && (
                            <div className="salary-savings-entries">
                              {savings.entries.slice(0, 3).map((e) => (
                                <div className="salary-row" key={e.id}>
                                  <span>
                                    {e.description} · {formatDateShort(e.date)}
                                  </span>
                                  <span>{peso(e.amount)}</span>
                                </div>
                              ))}
                              {savings.entries.length > 3 && (
                                <button
                                  className="salary-inline-btn"
                                  onClick={() => setTab("spending")}
                                >
                                  + {savings.entries.length - 3} more — view spending log
                                </button>
                              )}
                            </div>
                          )}

                          <div className="salary-savings-actions">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                setAllocateFor({
                                  netPay: period.netPay,
                                  alreadyAllocated: savings.plannedSavings,
                                  payPeriodDate: period.payDate,
                                })
                              }
                            >
                              + Allocate Money
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setTab("savings")}>
                              View Savings
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {expenseForm && (
        <div className="modal-overlay" onMouseDown={() => setExpenseForm(null)}>
          <div className="card salary-expense-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit expense" : "Add expense"}</h3>
            <div className="field">
              <label>Description</label>
              <input
                type="text"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="e.g. cash advance, uniform, tools"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Amount</label>
              <input
                type="text"
                inputMode="decimal"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="salary-modal-actions">
              <button className="btn btn-ghost" onClick={() => setExpenseForm(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveExpense}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {allocateFor && (
        <AllocateModal
          netPay={allocateFor.netPay}
          alreadyAllocated={allocateFor.alreadyAllocated}
          payPeriodDate={allocateFor.payPeriodDate}
          goals={goals}
          defaultAmount={config.defaultAllocationAmount}
          onClose={() => setAllocateFor(null)}
          onSave={(input) => {
            allocate(input);
            setAllocateFor(null);
          }}
          onCreateGoal={() => {
            setAllocateFor(null);
            setQuickNewGoal(true);
          }}
        />
      )}

      {quickNewGoal && (
        <GoalFormModal
          onClose={() => setQuickNewGoal(false)}
          onSave={(input) => {
            addGoal(input);
            setQuickNewGoal(false);
            setTab("savings");
          }}
        />
      )}
    </div>
  );
}