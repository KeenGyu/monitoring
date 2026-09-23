// ---- Salary Tracker: types ----
// Kept in its own file so it doesn't collide with your existing types.ts.
// Feel free to move these into types.ts later if you'd rather keep one file.

export type EmploymentStatus = "probationary" | "regular";

export interface SalaryConfig {
  /** Which rate applies today. */
  employmentStatus: EmploymentStatus;
  /** Fixed daily rate while probationary. No OT pay. */
  probationaryRate: number;
  /** Fixed daily rate once regular. No OT pay. */
  regularRate: number;
  /**
   * Optional ISO date you became regular. When set (and status is "regular"),
   * days before this date are still paid at the probationary rate, so past
   * payouts don't get recalculated at the higher rate.
   */
  regularizedOn: string | null;
  /** Paid hours in a working day. Used to turn the daily rate into a per-minute rate. */
  hoursPerDay: number;
  /** Auto-deduct Late / Half-day / Undertime records flagged "Deduct from my salary". */
  deductAttendance: boolean;

  /** Work week: every day except Sunday. Index 0 = Sunday ... 6 = Saturday. */
  restDays: number[]; // default [0] (Sunday only)

  /** Which statutory deductions to apply. Turn off any you're not enrolled in. */
  deductSss: boolean;
  deductPhilHealth: boolean;
  deductPagIbig: boolean;

  /**
   * "computed" applies the standard statutory formulas (see salaryCalc.ts).
   * "manual" instead deducts the same fixed amount every cutoff — use this
   * when your employer's actual payslip numbers don't match the textbook
   * formulas (e.g. an uncapped Pag-IBIG rate), which is the common case.
   */
  deductionMode: "computed" | "manual";

  /** Fixed amount deducted every cutoff when deductionMode is "manual". */
  manualSss: number;
  manualPhilHealth: number;
  manualPagIbig: number;

  /**
   * Only used when deductionMode is "computed". Statutory contributions are
   * computed once per "salary month" (the 26th of the previous month through
   * the 25th of the current month — i.e. the span covered by both cutoffs
   * that pay out in a given calendar month) and then split across the two
   * payouts. Switch to "first" or "second" if your employer deducts it all
   * at once instead.
   */
  contributionSplit: "even" | "first" | "second";

    /** Payouts with a pay date before this are treated as "no salary yet". */
  firstPayoutDate: string | null;

  /** Prefilled amount when opening "Allocate Money" — just a convenience default. */
  defaultAllocationAmount: number;
}

export const DEFAULT_SALARY_CONFIG: SalaryConfig = {
  employmentStatus: "regular",
  probationaryRate: 540,
  regularRate: 570,
  regularizedOn: null,
  hoursPerDay: 8,
  deductAttendance: true,
  restDays: [0],
  deductSss: true,
  deductPhilHealth: true,
  deductPagIbig: true,
  deductionMode: "manual",
  manualSss: 350.0,
  manualPhilHealth: 176.63,
  manualPagIbig: 141.3,
  contributionSplit: "even",
    firstPayoutDate: "2026-09-30",
  defaultAllocationAmount: 2000,
};

export type CutoffId = "first" | "second";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  /** ISO date the expense was logged/incurred. */
  date: string;
  /** payDate (YYYY-MM-DD) of the period this expense should be deducted from. */
  payPeriodDate: string;
  createdAt: string;
}

/** One late / half-day / undertime deduction inside a pay period. */
export interface AttendanceDeduction {
  /** Id of the source Absentee record. */
  id: string;
  date: string;
  type: string;
  minutes: number;
  amount: number;
}

/** One cutoff/payout cycle, fully computed. */
export interface PayPeriod {
  /** e.g. "2026-09-first" / "2026-09-second" */
  id: string;
  monthKey: string; // "2026-09"
  cutoff: CutoffId;
  /** Inclusive work-period start/end, ISO dates. */
  periodStart: string;
  periodEnd: string;
  /** Payout date, ISO date. */
  payDate: string;
  workDays: number;
  grossPay: number;
  sss: number;
  philHealth: number;
  pagIbig: number;
  totalContributions: number;
  attendanceDeductions: AttendanceDeduction[];
  totalAttendance: number;
  expenses: Expense[];
  totalExpenses: number;
  netPay: number;
    /** True when this cutoff is paid out before your first payout date. */
  beforeFirstPayout: boolean;
}

// ---- Savings / liquidation ----

/** One logged real-world spend — "where the money actually went". */
export interface SpendingEntry {
  id: string;
  description: string;
  amount: number;
  /** ISO date the money was spent. */
  date: string;
  createdAt: string;
}

export type NewSpendingInput = Pick<SpendingEntry, "description" | "amount" | "date">;

// ---- Savings goals ----

export type GoalCategory =
  | "Emergency Fund"
  | "Laptop"
  | "Phone"
  | "Travel"
  | "Investment"
  | "Personal"
  | "Other";

export type GoalStatus = "active" | "completed" | "archived";

export interface SavingsGoal {
  id: string;
  name: string;
  category: GoalCategory;
  targetAmount: number;
  /** Kept in sync from the sum of this goal's savings transactions. */
  currentAmount: number;
  createdAt: string; // ISO datetime
  targetDate: string | null; // ISO date, optional
  status: GoalStatus;
}

export type NewGoalInput = Pick<SavingsGoal, "name" | "category" | "targetAmount" | "targetDate">;

// ---- Savings transactions (money explicitly allocated toward a goal) ----

export type AllocationSource = "payout" | "manual";

/** One deposit toward a goal — a savings transaction, never a spend. */
export interface SavingsTransaction {
  id: string;
  goalId: string;
  amount: number;
  date: string; // ISO date
  note: string;
  source: AllocationSource;
  /** The payDate of the pay period this came from, when source is "payout". */
  payPeriodDate: string | null;
  createdAt: string;
}

export interface NewAllocationInput {
  goalId: string;
  amount: number;
  note?: string;
  payPeriodDate?: string | null;
}

/** Progress on one goal — a pure derived view, never persisted. */
export interface GoalProgress {
  goal: SavingsGoal;
  percent: number; // 0-100, clamped
  remaining: number; // max(0, target - current)
}

/** A cautious, data-driven estimate of when a goal will be reached. */
export interface GoalProjection {
  goalId: string;
  hasEstimate: boolean;
  avgPerAllocation: number;
  payoutsNeeded: number | null;
  estimatedCompletionDate: string | null; // ISO date
}

/**
 * Per-payout savings snapshot: net pay is untouched, actual money, and
 * "savings" is only ever what's been explicitly allocated toward a goal —
 * never assumed. Spending and savings stay in separate buckets throughout.
 */
export interface SavingsSummary {
  periodId: string;
  netPay: number;
  /** Sum of this payout's savings transactions (source "payout"). */
  plannedSavings: number;
  /** netPay - plannedSavings. What's left for day-to-day spending. */
  availableToSpend: number;
  /** plannedSavings / netPay * 100. 0 when netPay is 0. */
  savingsRate: number;
  /** Inclusive start of the spending window — this period's pay date. */
  windowStart: string;
  /** Exclusive end of the spending window — the next payout's pay date. */
  windowEnd: string;
  totalDays: number;
  /** Whole days left, today included, until windowEnd. 0 once the window has closed. */
  daysLeft: number;
  entries: SpendingEntry[];
  spent: number;
  /** availableToSpend - spent. Can go negative once over budget. */
  remainingToSpend: number;
  /** remainingToSpend / daysLeft. Null once the window has closed. */
  safeToSpendPerDay: number | null;
  status: "on-track" | "watch" | "over-budget";
  hasStarted: boolean;
  hasEnded: boolean;
}