import { useMemo, useState } from "react";
import { useSalary } from "../store.salary";
import { useApp } from "../store";
import {
  buildMonthPeriods,
  buildSavingsSummary,
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
import type { PayPeriod } from "../types.salary";
import { SpendingLog } from "../components/SpendingLog";
import "./SalaryPage.css";

function peso(n: number): string {
  return `\u20b1${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cutoffLabel(period: PayPeriod): string {
  return period.cutoff === "first" ? "1st cutoff" : "2nd cutoff";
}

type SalaryTab = "overview" | "spending";

export function SalaryPage() {
  const {
    loading,
    config,
    expenses,
    spending,
    updateConfig,
    addExpense,
    editExpense,
    deleteExpense,
    addSpending,
    editSpending,
    deleteSpending,
  } = useSalary();
  const { absentees } = useApp();
  const [tab, setTab] = useState<SalaryTab>("overview");
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [showSettings, setShowSettings] = useState(false);
  const [expenseForm, setExpenseForm] = useState<{ payPeriodDate: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const periods = useMemo(
    () => (loading ? [] : buildMonthPeriods(monthKey, config, expenses, absentees)),
    [monthKey, config, expenses, absentees, loading]
  );

  const activePeriodId = currentPayPeriodId(todayIso());
  const activeSpendingPeriodId = loading
    ? null
    : currentSpendingPeriodId(todayIso(), config, expenses, absentees);

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
      </div>

      {tab === "spending" ? (
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
                <label>Savings goal per cutoff</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={config.savingsGoalPerCutoff}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 0) updateConfig({ savingsGoalPerCutoff: v });
                  }}
                />
                <p className="salary-note">
                  How much of each payout you want left over, untouched, by the time the next one
                  arrives. The suggested daily budget below is built around hitting this.
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
                : buildSavingsSummary(period, config, spending, todayIso());
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
                          <div className="salary-savings-head">
                            <span className="salary-savings-title">
                              Savings goal
                              {isSpendingNow && <span className="salary-badge salary-badge-live">Now</span>}
                            </span>
                            <span
                              className={`salary-savings-amount ${
                                savings.remaining < 0 ? "over" : "ok"
                              }`}
                            >
                              {peso(savings.spent)} spent of {peso(savings.netPay)}
                            </span>
                          </div>

                          <div className="salary-savings-bar">
                            <div
                              className="salary-savings-bar-fill"
                              style={{
                                width: `${Math.min(
                                  100,
                                  savings.netPay > 0 ? (savings.spent / savings.netPay) * 100 : 0
                                )}%`,
                              }}
                            />
                            <div
                              className="salary-savings-bar-goal"
                              style={{
                                left: `${Math.min(
                                  100,
                                  savings.netPay > 0
                                    ? ((savings.netPay - savings.goal) / savings.netPay) * 100
                                    : 0
                                )}%`,
                              }}
                              title={`Goal: keep ${peso(savings.goal)} unspent`}
                            />
                          </div>

                          <div className="salary-savings-grid">
                            <div>
                              <div className="salary-savings-label">Window</div>
                              <div className="salary-savings-value">
                                {formatDateShort(savings.windowStart)} – {formatDateShort(savings.windowEnd)}{" "}
                                ({savings.totalDays}d)
                              </div>
                            </div>
                            <div>
                              <div className="salary-savings-label">
                                {savings.hasEnded ? "Result" : "On track for"}
                              </div>
                              <div
                                className={`salary-savings-value ${
                                  savings.remaining < 0 ? "over" : ""
                                }`}
                              >
                                {peso(savings.remaining)} saved
                              </div>
                            </div>
                            <div>
                              <div className="salary-savings-label">Planned budget</div>
                              <div className="salary-savings-value">
                                {savings.plannedDailyBudget !== null ? `${peso(savings.plannedDailyBudget)}/day` : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="salary-savings-label">
                                {savings.hasEnded ? "Window closed" : "Spend today, at most"}
                              </div>
                              <div
                                className={`salary-savings-value ${
                                  savings.paceDailyBudget !== null && savings.paceDailyBudget < 0
                                    ? "over"
                                    : "highlight"
                                }`}
                              >
                                {savings.paceDailyBudget !== null
                                  ? `${peso(savings.paceDailyBudget)}/day`
                                  : "—"}
                                {!savings.hasEnded && (
                                  <span className="salary-savings-sub"> · {savings.daysLeft}d left</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {savings.entries.length > 0 && (
                            <div className="salary-savings-entries">
                              {savings.entries.slice(0, 4).map((e) => (
                                <div className="salary-row" key={e.id}>
                                  <span>
                                    {e.description} · {formatDateShort(e.date)}
                                  </span>
                                  <span>{peso(e.amount)}</span>
                                </div>
                              ))}
                              {savings.entries.length > 4 && (
                                <button
                                  className="salary-inline-btn"
                                  onClick={() => setTab("spending")}
                                >
                                  + {savings.entries.length - 4} more — view spending log
                                </button>
                              )}
                            </div>
                          )}
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
    </div>
  );
}