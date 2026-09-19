import { useMemo, useState } from "react";
import type { Absentee, AbsenceStatus } from "../types";
import { useApp } from "../store";
import { AbsenteeCard } from "../components/AbsenteeCard";
import { EmptyState } from "../components/EmptyState";
import { currentMonthKey } from "../lib/dates";
import "./AbsenteesPage.css";

interface AbsenteesPageProps {
  onAddAbsentee: () => void;
  onEditAbsentee: (absentee: Absentee) => void;
  onDeleteAbsentee: (absentee: Absentee) => void;
}

const FILTERS: { id: "all" | AbsenceStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "unapproved", label: "Unapproved" },
];

export function AbsenteesPage({
  onAddAbsentee,
  onEditAbsentee,
  onDeleteAbsentee,
}: AbsenteesPageProps) {
  const { absentees } = useApp();
  const [filter, setFilter] = useState<"all" | AbsenceStatus>("all");

  const sorted = useMemo(
    () => [...absentees].sort((a, b) => b.date.localeCompare(a.date)),
    [absentees]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((a) => a.status === filter);
  }, [sorted, filter]);

  const thisMonth = currentMonthKey();
  const loggedThisMonth = absentees.filter((a) => a.date.startsWith(thisMonth));
  const pendingCount = absentees.filter((a) => a.status === "pending").length;
  const unapprovedCount = absentees.filter((a) => a.status === "unapproved").length;

  return (
    <div className="page">
      <header className="page-header absentees-header">
        <div>
          <h1>Absentees Monitoring</h1>
          <p className="page-subtitle">
            Keep tabs on who's out, why, and whether it's been approved.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onAddAbsentee}>
          + Log absence
        </button>
      </header>

      {absentees.length > 0 ? (
        <div className="absentee-stats-row">
          <div className="absentee-stat card">
            <div className="absentee-stat-count">{absentees.length}</div>
            <div className="absentee-stat-label">Total records</div>
          </div>
          <div className="absentee-stat card">
            <div className="absentee-stat-count">{loggedThisMonth.length}</div>
            <div className="absentee-stat-label">This month</div>
          </div>
          <div className="absentee-stat card">
            <div className="absentee-stat-count">{pendingCount}</div>
            <div className="absentee-stat-label">Pending</div>
          </div>
          <div className="absentee-stat card">
            <div className="absentee-stat-count">{unapprovedCount}</div>
            <div className="absentee-stat-label">Unapproved</div>
          </div>
        </div>
      ) : null}

      {absentees.length > 0 ? (
        <div className="filter-row" role="tablist" aria-label="Filter absences by status">
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

      {absentees.length === 0 ? (
        <EmptyState
          icon="⚑"
          title="No absences logged yet."
          subtitle="Log one whenever someone's out."
          action={
            <button className="btn btn-primary" onClick={onAddAbsentee}>
              + Log absence
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing here." subtitle="Try a different filter." />
      ) : (
        <div className="absentees-grid">
          {filtered.map((absentee) => (
            <AbsenteeCard
              key={absentee.id}
              absentee={absentee}
              onEdit={() => onEditAbsentee(absentee)}
              onDelete={() => onDeleteAbsentee(absentee)}
            />
          ))}
        </div>
      )}
    </div>
  );
}