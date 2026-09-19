import type { Report } from "../types";
import { useApp } from "../store";
import { StatusBadge } from "../components/StatusBadge";
import { ProgressBar } from "../components/ProgressBar";
import { EmptyState } from "../components/EmptyState";
import { SalaryTrendChart } from "../components/SalaryTrendChart";
import { displayStatus } from "../lib/status";
import { daysUntil, formatDate, formatDateTime } from "../lib/dates";
import "./Dashboard.css";

interface DashboardProps {
  onOpenReport: (report: Report) => void;
}

export function Dashboard({ onOpenReport }: DashboardProps) {
  const { reports } = useApp();

  const total = reports.length;
  const submitted = reports.filter((r) => r.status === "submitted");
  const overdue = reports.filter((r) => displayStatus(r) === "overdue");
  const inProgress = reports.filter(
    (r) => r.status === "in-progress" && displayStatus(r) !== "overdue"
  );
  const notStarted = reports.filter(
    (r) => r.status === "not-started" && displayStatus(r) !== "overdue"
  );
  const completion = total === 0 ? 0 : (submitted.length / total) * 100;

  const attention = reports
    .filter((r) => displayStatus(r) !== "submitted")
    .sort((a, b) => {
      const rank = (r: Report) => (displayStatus(r) === "overdue" ? 0 : 1);
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;
      const da = a.dueDate ?? "9999-12-31";
      const db = b.dueDate ?? "9999-12-31";
      return da.localeCompare(db);
    })
    .slice(0, 6);

  const recentlySubmitted = [...submitted]
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))
    .slice(0, 5);

  if (total === 0) {
    return (
      <div className="page">
        <PageHeader />
        <EmptyState
          icon="◈"
          title="No reports yet."
          subtitle="Looks like you're free... for now."
        />
        <SalaryTrendChart />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader />

      <section className="dash-stats card">
        <div className="dash-stats-header">
          <div>
            <div className="dash-stats-count">{total}</div>
            <div className="dash-stats-label">
              {total === 1 ? "report" : "reports"} total
            </div>
          </div>
          <div className="dash-stats-breakdown">
            <StatChip label="Submitted" value={submitted.length} tone="submitted" />
            <StatChip label="In progress" value={inProgress.length} tone="progress" />
            <StatChip label="Not started" value={notStarted.length} tone="neutral" />
            <StatChip label="Overdue" value={overdue.length} tone="overdue" />
          </div>
        </div>
        <div className="dash-progress">
          <div className="dash-progress-label">
            <span>Completion</span>
            <span>{Math.round(completion)}%</span>
          </div>
          <ProgressBar percent={completion} />
        </div>
      </section>

      <SalaryTrendChart />

      {attention.length === 0 ? (
        <section className="dash-section">
          <EmptyState
            icon="🎉"
            title="Everything is submitted."
            subtitle="Supervisor has received the offerings."
          />
        </section>
      ) : (
        <section className="dash-section">
          <h2 className="section-title">Needs attention</h2>
          <div className="attention-list">
            {attention.map((report) => (
              <button
                key={report.id}
                className="attention-row"
                onClick={() => onOpenReport(report)}
              >
                <StatusBadge status={displayStatus(report)} />
                <span className="attention-name">{report.name}</span>
                <span className="attention-due">{dueHint(report)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {recentlySubmitted.length > 0 ? (
        <section className="dash-section">
          <h2 className="section-title">Recently submitted</h2>
          <div className="recent-grid">
            {recentlySubmitted.map((report) => (
              <button
                key={report.id}
                className="recent-card"
                onClick={() => onOpenReport(report)}
              >
                <div className="recent-name">{report.name}</div>
                <div className="recent-status">✅ Submitted</div>
                <div className="recent-time">{formatDateTime(report.submittedAt)}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PageHeader() {
  return (
    <header className="page-header">
      <h1>Dashboard</h1>
      <p className="page-subtitle">A running tally of what's still owed and what's cleared.</p>
    </header>
  );
}

function dueHint(report: Report): string {
  if (!report.dueDate) return "No due date";
  const d = daysUntil(report.dueDate);
  if (d === null) return "";
  if (d < 0) return `${Math.abs(d)}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due ${formatDate(report.dueDate)}`;
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "submitted" | "progress" | "neutral" | "overdue";
}) {
  return (
    <div className={`stat-chip stat-${tone}`}>
      <span className="stat-chip-value">{value}</span>
      <span className="stat-chip-label">{label}</span>
    </div>
  );
}