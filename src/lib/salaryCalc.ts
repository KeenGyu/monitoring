import type {
  AttendanceDeduction,
  CutoffId,
  Expense,
  GoalProgress,
  GoalProjection,
  PayPeriod,
  SalaryConfig,
  SavingsGoal,
  SavingsSummary,
  SavingsTransaction,
  SpendingEntry,
} from "../types.salary";
import type { Absentee } from "../types";

// Cutoffs:
//   First:  26th of previous month -> 10th, paid on the 15th
//   Second: 11th -> 25th, paid on the 30th (clamped to month end)

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function shiftMonth(y: number, m: number, count: number): { y: number; m: number } {
  const total = m - 1 + count;
  const y2 = y + Math.floor(total / 12);
  const m2 = (((total % 12) + 12) % 12) + 1;
  return { y: y2, m: m2 };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseMonthKey(monthKey: string): { y: number; m: number } {
  const [y, m] = monthKey.split("-").map(Number);
  return { y, m };
}

export function monthKeyOf(y: number, m: number): string {
  return `${y}-${pad(m)}`;
}

export function cutoffRange(
  monthKey: string,
  cutoff: CutoffId
): { start: string; end: string; payDate: string } {
  const { y, m } = parseMonthKey(monthKey);

  if (cutoff === "first") {
    const prev = shiftMonth(y, m, -1);
    const startDay = Math.min(26, lastDayOfMonth(prev.y, prev.m));
    return {
      start: iso(prev.y, prev.m, startDay),
      end: iso(y, m, 10),
      payDate: iso(y, m, 15),
    };
  }

  return {
    start: iso(y, m, 11),
    end: iso(y, m, 25),
    payDate: iso(y, m, Math.min(30, lastDayOfMonth(y, m))),
  };
}

/** The payDate of whichever cutoff pays out right after the given one. */
export function nextCutoffPayDate(monthKey: string, cutoff: CutoffId): string {
  if (cutoff === "first") return cutoffRange(monthKey, "second").payDate;
  const { y, m } = parseMonthKey(monthKey);
  const next = shiftMonth(y, m, 1);
  return cutoffRange(monthKeyOf(next.y, next.m), "first").payDate;
}

function eachDate(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const end = new Date(`${endIso}T00:00:00`);
  const cursor = new Date(`${startIso}T00:00:00`);
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < 62) {
    out.push(iso(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return out;
}

/** Whole days from startIso up to (but not including) endIsoExclusive. */
export function daysBetween(startIso: string, endIsoExclusive: string): number {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIsoExclusive}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

// ---------------------------------------------------------------------
// Daily rate by employment status
// ---------------------------------------------------------------------

/** Rate that applies on a given date. If you're regular but have a
 *  regularization date set, days before it still use the probationary rate. */
export function rateForDate(dateIso: string, config: SalaryConfig): number {
  if (config.employmentStatus === "probationary") return config.probationaryRate;
  if (config.regularizedOn && dateIso < config.regularizedOn) return config.probationaryRate;
  return config.regularRate;
}

function workDates(startIso: string, endIso: string, restDays: number[]): string[] {
  const rest = new Set(restDays);
  return eachDate(startIso, endIso).filter(
    (d) => !rest.has(new Date(`${d}T00:00:00`).getDay())
  );
}

export function countWorkDays(startIso: string, endIso: string, restDays: number[]): number {
  return workDates(startIso, endIso, restDays).length;
}

function grossBetween(startIso: string, endIso: string, config: SalaryConfig): number {
  return workDates(startIso, endIso, config.restDays).reduce(
    (sum, d) => sum + rateForDate(d, config),
    0
  );
}

// ---------------------------------------------------------------------
// Attendance deductions (late / half-day / undertime)
// ---------------------------------------------------------------------

const ATTENDANCE_TYPES = ["Late", "Half-day", "Undertime"];

export function attendanceDeductionAmount(a: Absentee, config: SalaryConfig): number {
  const rate = rateForDate(a.date, config);
  if (a.type === "Half-day") return round2(rate / 2);
  const minutes = Math.max(0, a.minutes ?? 0);
  const perMinute = rate / config.hoursPerDay / 60;
  return round2(Math.min(rate, perMinute * minutes));
}

function attendanceFor(
  start: string,
  end: string,
  config: SalaryConfig,
  absentees: Absentee[]
): AttendanceDeduction[] {
  if (!config.deductAttendance) return [];
  return absentees
    .filter(
      (a) =>
        a.deductFromSalary &&
        ATTENDANCE_TYPES.includes(a.type) &&
        a.date >= start &&
        a.date <= end
    )
    .map((a) => ({
      id: a.id,
      date: a.date,
      type: a.type,
      minutes: a.minutes ?? 0,
      amount: attendanceDeductionAmount(a, config),
    }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------
// Statutory deductions — 2026 employee-share rules
// ---------------------------------------------------------------------

export function sssEmployeeShare(monthlyBasicSalary: number): number {
  if (monthlyBasicSalary <= 0) return 0;
  const msc = Math.min(35000, Math.max(5000, Math.round(monthlyBasicSalary / 500) * 500));
  return round2(msc * 0.05);
}

export function philHealthEmployeeShare(monthlyBasicSalary: number): number {
  if (monthlyBasicSalary <= 0) return 0;
  const base = Math.min(100000, Math.max(10000, monthlyBasicSalary));
  return round2(base * 0.05 * 0.5);
}

export function pagIbigEmployeeShare(monthlyBasicSalary: number): number {
  if (monthlyBasicSalary <= 0) return 0;
  const mfs = Math.min(10000, monthlyBasicSalary);
  const rate = monthlyBasicSalary <= 1500 ? 0.01 : 0.02;
  return round2(mfs * rate);
}

function monthlyContributionBase(monthKey: string, config: SalaryConfig): number {
  const first = cutoffRange(monthKey, "first");
  const second = cutoffRange(monthKey, "second");
  return grossBetween(first.start, first.end, config) + grossBetween(second.start, second.end, config);
}

function monthlyContributions(monthKey: string, config: SalaryConfig) {
  const base = monthlyContributionBase(monthKey, config);
  return {
    sss: config.deductSss ? sssEmployeeShare(base) : 0,
    philHealth: config.deductPhilHealth ? philHealthEmployeeShare(base) : 0,
    pagIbig: config.deductPagIbig ? pagIbigEmployeeShare(base) : 0,
  };
}

function splitFor(cutoff: CutoffId, config: SalaryConfig): number {
  if (config.contributionSplit === "first") return cutoff === "first" ? 1 : 0;
  if (config.contributionSplit === "second") return cutoff === "second" ? 1 : 0;
  return 0.5;
}

// ---------------------------------------------------------------------
// Building a pay period
// ---------------------------------------------------------------------

export function buildPayPeriod(
  monthKey: string,
  cutoff: CutoffId,
  config: SalaryConfig,
  expenses: Expense[],
  absentees: Absentee[] = []
): PayPeriod {
  const range = cutoffRange(monthKey, cutoff);

  // Cutoffs paid out before your first payout have no salary at all.
  if (config.firstPayoutDate && range.payDate < config.firstPayoutDate) {
    return {
      id: `${monthKey}-${cutoff}`,
      monthKey,
      cutoff,
      periodStart: range.start,
      periodEnd: range.end,
      payDate: range.payDate,
      workDays: 0,
      grossPay: 0,
      sss: 0,
      philHealth: 0,
      pagIbig: 0,
      totalContributions: 0,
      attendanceDeductions: [],
      totalAttendance: 0,
      expenses: [],
      totalExpenses: 0,
      netPay: 0,
      beforeFirstPayout: true,
    };
  }

  const workDays = countWorkDays(range.start, range.end, config.restDays);
  const grossPay = round2(grossBetween(range.start, range.end, config));

  let sss = 0;
  let philHealth = 0;
  let pagIbig = 0;

  if (config.deductionMode === "manual") {
    if (config.deductSss) sss = round2(config.manualSss);
    if (config.deductPhilHealth) philHealth = round2(config.manualPhilHealth);
    if (config.deductPagIbig) pagIbig = round2(config.manualPagIbig);
  } else {
    const monthly = monthlyContributions(monthKey, config);
    const share = splitFor(cutoff, config);
    sss = round2(monthly.sss * share);
    philHealth = round2(monthly.philHealth * share);
    pagIbig = round2(monthly.pagIbig * share);
  }

  const totalContributions = round2(sss + philHealth + pagIbig);

  const attendanceDeductions = attendanceFor(range.start, range.end, config, absentees);
  const totalAttendance = round2(attendanceDeductions.reduce((s, d) => s + d.amount, 0));

  const periodExpenses = expenses.filter((e) => e.payPeriodDate === range.payDate);
  const totalExpenses = round2(periodExpenses.reduce((sum, e) => sum + e.amount, 0));

  const netPay = round2(grossPay - totalContributions - totalAttendance - totalExpenses);

  return {
    id: `${monthKey}-${cutoff}`,
    monthKey,
    cutoff,
    periodStart: range.start,
    periodEnd: range.end,
    payDate: range.payDate,
    workDays,
    grossPay,
    sss,
    philHealth,
    pagIbig,
    totalContributions,
    attendanceDeductions,
    totalAttendance,
    expenses: periodExpenses,
    totalExpenses,
    netPay,
    beforeFirstPayout: false,
  };
}

export function buildMonthPeriods(
  monthKey: string,
  config: SalaryConfig,
  expenses: Expense[],
  absentees: Absentee[] = []
): [PayPeriod, PayPeriod] {
  return [
    buildPayPeriod(monthKey, "first", config, expenses, absentees),
    buildPayPeriod(monthKey, "second", config, expenses, absentees),
  ];
}

export function currentPayPeriodId(todayIso: string): string {
  const { y, m } = parseMonthKey(todayIso.slice(0, 7));
  const day = Number(todayIso.slice(8, 10));
  if (day <= 10) return `${monthKeyOf(y, m)}-first`;
  if (day <= 25) return `${monthKeyOf(y, m)}-second`;
  const next = shiftMonth(y, m, 1);
  return `${monthKeyOf(next.y, next.m)}-first`;
}

export function nextPayDate(todayIso: string): string {
  const id = currentPayPeriodId(todayIso);
  const [monthKey, cutoff] = [id.slice(0, 7), id.slice(8) as CutoffId];
  const range = cutoffRange(monthKey, cutoff);
  if (range.payDate >= todayIso) return range.payDate;
  const { y, m } = parseMonthKey(monthKey);
  if (cutoff === "first") return cutoffRange(monthKey, "second").payDate;
  const next = shiftMonth(y, m, 1);
  return cutoffRange(monthKeyOf(next.y, next.m), "first").payDate;
}

// ---------------------------------------------------------------------
// Savings / spending-window pace
// ---------------------------------------------------------------------

/**
 * The savings "spending window" for a payout isn't the cutoff's work
 * period — it's the stretch of calendar days the payout actually has to
 * cover: from the day it lands until the day the NEXT payout lands.
 */
export function savingsWindowFor(period: Pick<PayPeriod, "monthKey" | "cutoff" | "payDate">) {
  const windowEnd = nextCutoffPayDate(period.monthKey, period.cutoff);
  return {
    windowStart: period.payDate,
    windowEnd,
    totalDays: Math.max(1, daysBetween(period.payDate, windowEnd)),
  };
}

/**
 * Which pay period's spending window today falls inside — i.e. whose
 * payout you're currently living on. Different from currentPayPeriodId,
 * which tells you which cutoff you're currently WORKING (accruing days
 * toward the *next* payout).
 */
export function currentSpendingPeriodId(
  todayIso: string,
  config: SalaryConfig,
  expenses: Expense[],
  absentees: Absentee[] = []
): string | null {
  const { y, m } = parseMonthKey(todayIso.slice(0, 7));
  const candidateMonths = [
    shiftMonth(y, m, -1),
    { y, m },
    shiftMonth(y, m, 1),
  ].map((v) => monthKeyOf(v.y, v.m));

  const candidates: PayPeriod[] = [];
  for (const mk of candidateMonths) {
    candidates.push(buildPayPeriod(mk, "first", config, expenses, absentees));
    candidates.push(buildPayPeriod(mk, "second", config, expenses, absentees));
  }

  for (const period of candidates) {
    if (period.beforeFirstPayout) continue;
    const { windowStart, windowEnd } = savingsWindowFor(period);
    if (todayIso >= windowStart && todayIso < windowEnd) return period.id;
  }
  return null;
}

export function buildSavingsSummary(
  period: PayPeriod,
  spending: SpendingEntry[],
  transactions: SavingsTransaction[],
  todayIso: string
): SavingsSummary {
  const { windowStart, windowEnd, totalDays } = savingsWindowFor(period);

  // Savings is only ever what's been explicitly allocated to THIS payout —
  // never assumed from net pay. Net pay itself is never modified.
  const plannedSavings = round2(
    transactions
      .filter((t) => t.source === "payout" && t.payPeriodDate === period.payDate)
      .reduce((sum, t) => sum + t.amount, 0)
  );
  const availableToSpend = round2(period.netPay - plannedSavings);
  const savingsRate = period.netPay > 0 ? round2((plannedSavings / period.netPay) * 100) : 0;

  const entries = spending
    .filter((e) => e.date >= windowStart && e.date < windowEnd)
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));

  const spent = round2(entries.reduce((sum, e) => sum + e.amount, 0));
  const remainingToSpend = round2(availableToSpend - spent);

  const hasStarted = todayIso >= windowStart;
  const hasEnded = todayIso >= windowEnd;
  const daysLeft = hasEnded ? 0 : hasStarted ? Math.max(1, daysBetween(todayIso, windowEnd)) : totalDays;

  const safeToSpendPerDay = hasEnded ? null : round2(remainingToSpend / daysLeft);

  // Status: compare actual spend-so-far against the proportional share of
  // the available amount for however much of the window has elapsed.
  let status: SavingsSummary["status"] = "on-track";
  if (remainingToSpend < 0) {
    status = "over-budget";
  } else if (hasStarted && !hasEnded && availableToSpend > 0) {
    const daysElapsed = Math.max(0, totalDays - daysLeft);
    const expectedSpentSoFar = availableToSpend * (daysElapsed / totalDays);
    if (spent > expectedSpentSoFar * 1.15 + 1) status = "watch";
  }

  return {
    periodId: period.id,
    netPay: period.netPay,
    plannedSavings,
    availableToSpend,
    savingsRate,
    windowStart,
    windowEnd,
    totalDays,
    daysLeft,
    entries,
    spent,
    remainingToSpend,
    safeToSpendPerDay,
    status,
    hasStarted,
    hasEnded,
  };
}

// ---------------------------------------------------------------------
// Savings goals — progress and cautious completion estimates
// ---------------------------------------------------------------------

export function computeGoalProgress(goal: SavingsGoal): GoalProgress {
  const percent =
    goal.targetAmount > 0 ? Math.min(100, round2((goal.currentAmount / goal.targetAmount) * 100)) : 0;
  const remaining = Math.max(0, round2(goal.targetAmount - goal.currentAmount));
  return { goal, percent, remaining };
}

/**
 * A conservative estimate of when a goal will be reached, based purely on
 * that goal's own allocation history. Refuses to guess with fewer than two
 * allocations, since one data point can't establish a pace.
 */
export function computeGoalProjection(
  goal: SavingsGoal,
  goalTransactions: SavingsTransaction[]
): GoalProjection {
  const txns = goalTransactions
    .filter((t) => t.goalId === goal.id)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const remaining = Math.max(0, round2(goal.targetAmount - goal.currentAmount));

  if (goal.status === "completed" || remaining <= 0 || txns.length < 2) {
    return {
      goalId: goal.id,
      hasEstimate: false,
      avgPerAllocation: 0,
      payoutsNeeded: null,
      estimatedCompletionDate: null,
    };
  }

  const avgPerAllocation = round2(
    txns.reduce((sum, t) => sum + t.amount, 0) / txns.length
  );

  const gaps: number[] = [];
  for (let i = 1; i < txns.length; i++) {
    gaps.push(Math.max(1, daysBetween(txns[i - 1].date, txns[i].date)));
  }
  const avgIntervalDays = Math.max(1, Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length));

  if (avgPerAllocation <= 0) {
    return {
      goalId: goal.id,
      hasEstimate: false,
      avgPerAllocation: 0,
      payoutsNeeded: null,
      estimatedCompletionDate: null,
    };
  }

  const payoutsNeeded = Math.ceil(remaining / avgPerAllocation);
  const lastDate = txns[txns.length - 1].date;
  const lastDateObj = new Date(`${lastDate}T00:00:00`);
  lastDateObj.setDate(lastDateObj.getDate() + avgIntervalDays * payoutsNeeded);
  const estimatedCompletionDate = iso(
    lastDateObj.getFullYear(),
    lastDateObj.getMonth() + 1,
    lastDateObj.getDate()
  );

  return {
    goalId: goal.id,
    hasEstimate: true,
    avgPerAllocation,
    payoutsNeeded,
    estimatedCompletionDate,
  };
}