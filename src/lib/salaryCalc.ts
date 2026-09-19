import type { CutoffId, Expense, PayPeriod, SalaryConfig } from "../types.salary";

// ---------------------------------------------------------------------
// Cutoff / payout schedule
//
//   First cutoff:  26th of the previous month -> 10th of this month
//                  paid out on the 15th
//   Second cutoff: 11th -> 25th of this month
//                  paid out on the 30th (clamped to the last day of the
//                  month for Feb, and for any month you configure to end
//                  before the 30th)
// ---------------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function iso(y: number, m: number, d: number): string {
  // m is 1-indexed here for readability at call sites
  return `${y}-${pad(m)}-${pad(d)}`;
}

function lastDayOfMonth(y: number, m: number): number {
  // m is 1-indexed
  return new Date(y, m, 0).getDate();
}

/** Add `count` months to a 1-indexed (year, month) pair, normalizing overflow. */
function shiftMonth(y: number, m: number, count: number): { y: number; m: number } {
  const total = (m - 1) + count;
  const y2 = y + Math.floor(total / 12);
  const m2 = (((total % 12) + 12) % 12) + 1;
  return { y: y2, m: m2 };
}

export function parseMonthKey(monthKey: string): { y: number; m: number } {
  const [y, m] = monthKey.split("-").map(Number);
  return { y, m };
}

export function monthKeyOf(y: number, m: number): string {
  return `${y}-${pad(m)}`;
}

/** Inclusive date range for a cutoff, before clamping to actual calendar days. */
export function cutoffRange(
  monthKey: string,
  cutoff: CutoffId
): { start: string; end: string; payDate: string } {
  const { y, m } = parseMonthKey(monthKey);

  if (cutoff === "first") {
    const prev = shiftMonth(y, m, -1);
    const prevLastDay = lastDayOfMonth(prev.y, prev.m);
    const startDay = Math.min(26, prevLastDay);
    return {
      start: iso(prev.y, prev.m, startDay),
      end: iso(y, m, 10),
      payDate: iso(y, m, 15),
    };
  }

  const monthLastDay = lastDayOfMonth(y, m);
  return {
    start: iso(y, m, 11),
    end: iso(y, m, 25),
    payDate: iso(y, m, Math.min(30, monthLastDay)),
  };
}

/** Every ISO date from start to end, inclusive. */
function eachDate(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const cursor = new Date(start);
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < 62) {
    out.push(
      iso(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate())
    );
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return out;
}

export function countWorkDays(
  startIso: string,
  endIso: string,
  restDays: number[]
): number {
  const rest = new Set(restDays);
  return eachDate(startIso, endIso).filter((d) => {
    const day = new Date(`${d}T00:00:00`).getDay();
    return !rest.has(day);
  }).length;
}

// ---------------------------------------------------------------------
// Statutory deductions — 2026 employee-share rules.
// These are the standard formal-employment rates as of 2026; if your
// employer computes differently (e.g. a fixed enrolled MSC), adjust here.
// ---------------------------------------------------------------------

/** SSS: 15% of Monthly Salary Credit, 5% employee share. MSC runs P5,000–P35,000
 *  in P500 brackets, centered on the nearest P500 (so P5,250 rounds up to MSC 5,500). */
export function sssEmployeeShare(monthlyBasicSalary: number): number {
  if (monthlyBasicSalary <= 0) return 0;
  const msc = Math.min(35000, Math.max(5000, Math.round(monthlyBasicSalary / 500) * 500));
  return round2(msc * 0.05);
}

/** PhilHealth: 5% of monthly basic salary, split 50/50. Floor P10,000, ceiling P100,000. */
export function philHealthEmployeeShare(monthlyBasicSalary: number): number {
  if (monthlyBasicSalary <= 0) return 0;
  const base = Math.min(100000, Math.max(10000, monthlyBasicSalary));
  return round2(base * 0.05 * 0.5);
}

/** Pag-IBIG: 1% (salary <= P1,500) or 2% (salary > P1,500) of Monthly Fund Salary,
 *  which is capped at P10,000 — so the max employee share is P200. */
export function pagIbigEmployeeShare(monthlyBasicSalary: number): number {
  if (monthlyBasicSalary <= 0) return 0;
  const mfs = Math.min(10000, monthlyBasicSalary);
  const rate = monthlyBasicSalary <= 1500 ? 0.01 : 0.02;
  return round2(mfs * rate);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------
// Building a full pay period
// ---------------------------------------------------------------------

/**
 * The "salary month" for contribution purposes is the 26th of the previous
 * month through the 25th of the current month — i.e. exactly the span
 * covered by the first cutoff (26–10) and second cutoff (11–25) that both
 * pay out in `monthKey`. Contributions are computed once on that combined
 * total, then split per `config.contributionSplit`.
 */
function monthlyContributionBase(monthKey: string, config: SalaryConfig): number {
  const first = cutoffRange(monthKey, "first");
  const second = cutoffRange(monthKey, "second");
  const days =
    countWorkDays(first.start, first.end, config.restDays) +
    countWorkDays(second.start, second.end, config.restDays);
  return days * config.dailyRate;
}

function monthlyContributions(monthKey: string, config: SalaryConfig) {
  const base = monthlyContributionBase(monthKey, config);
  const sss = config.deductSss ? sssEmployeeShare(base) : 0;
  const philHealth = config.deductPhilHealth ? philHealthEmployeeShare(base) : 0;
  const pagIbig = config.deductPagIbig ? pagIbigEmployeeShare(base) : 0;
  return { sss, philHealth, pagIbig };
}

function splitFor(cutoff: CutoffId, config: SalaryConfig): number {
  if (config.contributionSplit === "first") return cutoff === "first" ? 1 : 0;
  if (config.contributionSplit === "second") return cutoff === "second" ? 1 : 0;
  return 0.5;
}

export function buildPayPeriod(
  monthKey: string,
  cutoff: CutoffId,
  config: SalaryConfig,
  expenses: Expense[]
): PayPeriod {
  const range = cutoffRange(monthKey, cutoff);
  const workDays = countWorkDays(range.start, range.end, config.restDays);
  const grossPay = round2(workDays * config.dailyRate);

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

  const periodExpenses = expenses.filter((e) => e.payPeriodDate === range.payDate);
  const totalExpenses = round2(periodExpenses.reduce((sum, e) => sum + e.amount, 0));

  const netPay = round2(grossPay - totalContributions - totalExpenses);

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
    expenses: periodExpenses,
    totalExpenses,
    netPay,
  };
}

export function buildMonthPeriods(
  monthKey: string,
  config: SalaryConfig,
  expenses: Expense[]
): [PayPeriod, PayPeriod] {
  return [
    buildPayPeriod(monthKey, "first", config, expenses),
    buildPayPeriod(monthKey, "second", config, expenses),
  ];
}

/** Which pay period today's date falls into — used to default new expenses. */
export function currentPayPeriodId(todayIso: string): string {
  const { y, m } = parseMonthKey(todayIso.slice(0, 7));
  const day = Number(todayIso.slice(8, 10));
  // Work-period 26–10 spans two calendar months; if we're between the 1st
  // and 10th, we're still inside the *first* cutoff whose month label is
  // the current month. If we're 11–25, we're in the second cutoff. If
  // we're 26–end, we're in the first cutoff of *next* month's label.
  if (day <= 10) return `${monthKeyOf(y, m)}-first`;
  if (day <= 25) return `${monthKeyOf(y, m)}-second`;
  const next = shiftMonth(y, m, 1);
  return `${monthKeyOf(next.y, next.m)}-first`;
}

/** The next payout date on or after today, as an ISO date. */
export function nextPayDate(todayIso: string): string {
  const id = currentPayPeriodId(todayIso);
  const [monthKey, cutoff] = [id.slice(0, 7), id.slice(8) as CutoffId];
  const range = cutoffRange(monthKey, cutoff);
  if (range.payDate >= todayIso) return range.payDate;
  // today is past this period's payDate (shouldn't normally happen given
  // currentPayPeriodId's boundaries, but fall back to the following period)
  const { y, m } = parseMonthKey(monthKey);
  if (cutoff === "first") return cutoffRange(monthKey, "second").payDate;
  const next = shiftMonth(y, m, 1);
  return cutoffRange(monthKeyOf(next.y, next.m), "first").payDate;
}