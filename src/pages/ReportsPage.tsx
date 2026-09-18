import { useMemo, useState } from "react";
import type { DisplayStatus, Report } from "../types";
import { useApp } from "../store";
import { ReportCard } from "../components/ReportCard";
import { EmptyState } from "../components/EmptyState";
import { displayStatus } from "../lib/status";
import "./ReportsPage.css";

interface ReportsPageProps {
  onAddReport: () => void;
  onOpenReport: (report: Report) => void;
  onEditReport: (report: Report) => void;
  onSubmitReport: (report: Report) => void;
}

const FILTERS: { id: "all" | DisplayStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "not-started", label: "Not started" },
  { id: "in-progress", label: "In progress" },
  { id: "overdue", label: "Overdue" },
  { id: "submitted", label: "Submitted" },
];

export function ReportsPage({
  onAddReport,
  onOpenReport,
  onEditReport,
  onSubmitReport,
}: ReportsPageProps) {
  const { reports, setStatus } = useApp();
  const [filter, setFilter] = useState<"all" | DisplayStatus>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter((r) => displayStatus(r) === filter);
  }, [reports, filter]);

  return (
    <div className="page">
      <header className="page-header reports-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">Everything you're tracking, in one place.</p>
        </div>
        <button className="btn btn-primary" onClick={onAddReport}>
          + Add report
        </button>
      </header>

      {reports.length > 0 ? (
        <div className="filter-row" role="tablist" aria-label="Filter reports by status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`filter-chip ${filter === f.id ? "active" : ""}`}
              onClick={() => setFilter(f.id)}
              role="tab"
              aria-selected={filter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {reports.length === 0 ? (
        <EmptyState
          title="No reports yet."
          subtitle="Looks like you're free... for now."
          action={
            <button className="btn btn-primary" onClick={onAddReport}>
              + Add report
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing here." subtitle="Try a different filter." />
      ) : (
        <div className="reports-grid">
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onOpen={() => onOpenReport(report)}
              onEdit={() => onEditReport(report)}
              onMarkInProgress={() => setStatus(report.id, "in-progress")}
              onSubmit={() => onSubmitReport(report)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
