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