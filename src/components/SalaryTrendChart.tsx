import { useMemo, useState } from "react";
import { useSalary } from "../store.salary";
import { useApp } from "../store";
import { buildMonthPeriods } from "../lib/salaryCalc";
import { todayIso } from "../lib/dates";
import "./SalaryTrendChart.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const W = 640;
const H = 260;
const L = 60;
const R = 16;
const T = 16;
const B = 34;
const INNER_W = W - L - R;
const INNER_H = H - T - B;

interface MonthTotals {
  received: number; // payouts already paid out this month
  expected: number; // payouts this month that count (after your first payout)
  hasData: boolean;
  net: number;
  gross: number;
  expenses: number;
  attendance: number;
}

function peso(n: number): string {
  return `\u20b1${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compact(n: number): string {
  return n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(Math.round(n));
}

function niceTop(max: number): number {
  const raw = Math.max(max, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return step * 4;
}

function monthKeyFor(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function Delta({
  now,
  prev,
  upIsGood,
}: {
  now: number;
  prev: number | undefined;
  upIsGood: boolean;
}) {
  if (prev === undefined) return <span className="trend-delta">—</span>;
  const diff = now - prev;
  if (Math.abs(diff) < 0.005) return <span className="trend-delta">no change</span>;
  const up = diff > 0;
  const good = up === upIsGood;
  const pct = prev !== 0 ? ` (${up ? "+" : ""}${((diff / prev) * 100).toFixed(1)}%)` : "";
  return (
    <span className={`trend-delta ${good ? "good" : "bad"}`}>
      {up ? "▲" : "▼"} {peso(Math.abs(diff))}
      {pct}
    </span>
  );
}

export function SalaryTrendChart() {
  const { loading, config, expenses } = useSalary();
  const { absentees } = useApp();
  const [year, setYear] = useState(() => Number(todayIso().slice(0, 4)));
  const [hover, setHover] = useState<number | null>(null);

  // rows[0] = December of the previous year (only used for the January
  // comparison), rows[1..12] = January..December of the selected year.
  const rows = useMemo<MonthTotals[]>(() => {
    if (loading) return [];
    const today = todayIso();
    const keys = [monthKeyFor(year - 1, 12), ...Array.from({ length: 12 }, (_, i) => monthKeyFor(year, i + 1))];
    return keys.map((key) => {
      // Payouts before your first payout date don't exist; payouts in the
      // future haven't been received yet. Only real, received ones count.
      const counted = buildMonthPeriods(key, config, expenses, absentees).filter(
        (p) => !p.beforeFirstPayout
      );
      const paid = counted.filter((p) => p.payDate <= today);
      const sum = (pick: (p: (typeof paid)[number]) => number) =>
        Math.round(paid.reduce((s, p) => s + pick(p), 0) * 100) / 100;
      return {
        received: paid.length,
        expected: counted.length,
        hasData: paid.length > 0,
        net: sum((p) => p.netPay),
        gross: sum((p) => p.grossPay),
        expenses: sum((p) => p.totalExpenses),
        attendance: sum((p) => p.totalAttendance),
      };
    });
  }, [loading, year, config, expenses, absentees]);

  if (loading || rows.length === 0) return null;

  const months = rows.slice(1);
  const lastData = months.reduce((acc, m, i) => (m.hasData ? i : acc), -1);
  const sel = hover ?? lastData;
  const current = sel >= 0 ? months[sel] : undefined;
  const prevRow = sel >= 0 ? (sel === 0 ? rows[0] : months[sel - 1]) : undefined;
  const isPartial = current ? current.received < current.expected : false;
  // Only compare against a previous month that had both payouts, and only
  // when this month is complete, so the comparison is like for like.
  const prev = !isPartial && prevRow && prevRow.received >= 2 ? prevRow : undefined;

  const top = niceTop(Math.max(...months.flatMap((m) => [m.net, m.expenses]), 1));
  const slot = INNER_W / 12;
  const x = (i: number) => L + slot * (i + 0.5);
  const y = (v: number) => T + INNER_H - (Math.max(0, v) / top) * INNER_H;

  const line = (pick: (m: MonthTotals) => number) => {
    let d = "";
    let pen = false;
    months.forEach((m, i) => {
      if (!m.hasData) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(pick(m)).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const yearNet = months.reduce((s, m) => s + m.net, 0);
  const yearExpenses = months.reduce((s, m) => s + m.expenses, 0);

  return (
    <section className="trend card">
      <div className="trend-head">
        <div>
          <h2 className="section-title">Pay &amp; expenses trend</h2>
          <p className="trend-sub">Actual payouts received, per month</p>
        </div>
        <div className="trend-year">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setYear(year - 1);
              setHover(null);
            }}
            aria-label="Previous year"
          >
            ‹
          </button>
          <span className="trend-year-label">{year}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setYear(year + 1);
              setHover(null);
            }}
            aria-label="Next year"
          >
            ›
          </button>
        </div>
      </div>

      {lastData < 0 ? (
        <p className="trend-empty">No payouts received in {year} yet.</p>
      ) : (
        <>
          <div className="trend-summary">
            <span>
              {year} net pay so far: <strong>{peso(yearNet)}</strong>
            </span>
            <span>
              Expenses so far: <strong>{peso(yearExpenses)}</strong>
            </span>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="trend-svg"
            role="img"
            aria-label={`Net pay and expenses by month, ${year}`}
          >
            {[0, 1, 2, 3, 4].map((t) => {
              const v = (top / 4) * t;
              return (
                <g key={t}>
                  <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="trend-grid" />
                  <text x={L - 8} y={y(v) + 4} className="trend-axis" textAnchor="end">
                    {compact(v)}
                  </text>
                </g>
              );
            })}

            {MONTHS.map((label, i) => (
              <text
                key={label}
                x={x(i)}
                y={H - 10}
                className={`trend-axis ${months[i].hasData ? "" : "trend-axis-dim"}`}
                textAnchor="middle"
              >
                {label}
              </text>
            ))}

            {sel >= 0 && <line x1={x(sel)} x2={x(sel)} y1={T} y2={T + INNER_H} className="trend-cursor" />}

            <path d={line((m) => m.net)} className="trend-line trend-net" />
            <path d={line((m) => m.expenses)} className="trend-line trend-exp" />

            {months.map((m, i) => (
              <g key={i}>
                {m.hasData && (
                  <>
                    <circle cx={x(i)} cy={y(m.net)} r={i === sel ? 5 : 3} className="trend-dot trend-net-dot" />
                    <circle cx={x(i)} cy={y(m.expenses)} r={i === sel ? 5 : 3} className="trend-dot trend-exp-dot" />
                  </>
                )}
                <rect
                  x={x(i) - slot / 2}
                  y={T}
                  width={slot}
                  height={INNER_H}
                  fill="transparent"
                  onMouseEnter={() => m.hasData && setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => m.hasData && setHover(i)}
                />
              </g>
            ))}
          </svg>

          <div className="trend-legend">
            <span>
              <i className="legend-swatch trend-net-dot" /> Net pay
            </span>
            <span>
              <i className="legend-swatch trend-exp-dot" /> Expenses
            </span>
          </div>

          {current && (
            <div className="trend-readout">
              <div className="trend-readout-title">
                {FULL_MONTHS[sel]} {year}
                {isPartial ? (
                  <span className="trend-readout-vs">
                    {" "}
                    · {current.received} of {current.expected} payouts received so far
                  </span>
                ) : (
                  <span className="trend-readout-vs">
                    {prev ? " vs previous month" : ""}
                  </span>
                )}
              </div>
              <div className="trend-readout-grid">
                <div>
                  <div className="trend-readout-label">Net pay</div>
                  <div className="trend-readout-value">{peso(current.net)}</div>
                  <Delta now={current.net} prev={prev?.net} upIsGood />
                </div>
                <div>
                  <div className="trend-readout-label">Expenses</div>
                  <div className="trend-readout-value">{peso(current.expenses)}</div>
                  <Delta now={current.expenses} prev={prev?.expenses} upIsGood={false} />
                </div>
                <div>
                  <div className="trend-readout-label">Gross</div>
                  <div className="trend-readout-value">{peso(current.gross)}</div>
                  <Delta now={current.gross} prev={prev?.gross} upIsGood />
                </div>
                <div>
                  <div className="trend-readout-label">Late / undertime</div>
                  <div className="trend-readout-value">{peso(current.attendance)}</div>
                  <Delta now={current.attendance} prev={prev?.attendance} upIsGood={false} />
                </div>
              </div>
              {(isPartial || !prev) && (
                <p className="trend-note">
                  Comparison with the previous month appears once both months have both payouts in.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}