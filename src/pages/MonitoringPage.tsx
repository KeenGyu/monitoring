import { useApp } from "../store";
import type { DisplayStatus, Report } from "../types";
import { displayStatus } from "../lib/status";
import { addMonths, monthLabel, monthsBetween } from "../lib/dates";
import { EmptyState } from "../components/EmptyState";
import "./MonitoringPage.css";

const CELL_ICON: Record<DisplayStatus, string> = {
  submitted: "\ud83d\udfe2",
  "in-progress": "\ud83d\udfe1",
  "not-started": "\u26aa",
  overdue: "\ud83d\udd34",
};

function reportMonths(report: Report): string[] {
  if (report.monitoringStart && report.monitoringEnd) {
    return monthsBetween(
      report.monitoringStart.slice(0, 7),
      report.monitoringEnd.slice(0, 7)
    );
  }
  return [];
}

export function MonitoringPage({ onOpenReport }: { onOpenReport: (r: Report) => void }) {
  const { reports, settings, updateMonitoringPeriod } = useApp();
  const { startMonth, endMonth } = settings.monitoringPeriod;
  const months = monthsBetween(startMonth, endMonth);

  function shiftPeriod(delta: number) {
    updateMonitoringPeriod(addMonths(startMonth, delta), addMonths(endMonth, delta));
  }

  return (
    <div className="page">
      <header className="page-header monitoring-header">
        <div>
          <h1>3-Month Monitoring</h1>
          <p className="page-subtitle">
            A visual read on coverage across the period you're watching.
          </p>
        </div>
        <div className="period-controls">
          <button className="btn btn-sm btn-ghost" onClick={() => shiftPeriod(-1)}>
            ← Earlier
          </button>
          <div className="period-fields">
            <div className="field">
              <label htmlFor="mp-start">Start month</label>
              <input
                id="mp-start"
                type="month"
                value={startMonth}
                onChange={(e) => updateMonitoringPeriod(e.target.value, endMonth)}
              />
            </div>
            <div className="field">
              <label htmlFor="mp-end">End month</label>
              <input
                id="mp-end"
                type="month"
                value={endMonth}
                onChange={(e) => updateMonitoringPeriod(startMonth, e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => shiftPeriod(1)}>
            Later →
          </button>
        </div>
      </header>

      {reports.length === 0 ? (
        <EmptyState title="Nothing to monitor yet." subtitle="Add a report to see it here." />
      ) : (
        <div className="monitor-table-wrap card">
          <table className="monitor-table">
            <thead>
              <tr>
                <th className="monitor-name-col">Report</th>
                {months.map((m) => (
                  <th key={m}>{monthLabel(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const covered = reportMonths(report);
                return (
                  <tr key={report.id}>
                    <td className="monitor-name-col">
                      <button className="monitor-name-btn" onClick={() => onOpenReport(report)}>
                        {report.name}
                      </button>
                    </td>
                    {months.map((m) => {
                      const inScope = covered.length === 0 || covered.includes(m);
                      const status = displayStatus(report);
                      return (
                        <td key={m} className="monitor-cell">
                          {inScope ? (
                            <span title={status}>{CELL_ICON[status]}</span>
                          ) : (
                            <span className="monitor-cell-dim">{"\u2013"}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="monitor-legend">
        <span>🟢 Completed</span>
        <span>🟡 In progress</span>
        <span>⚪ Not started</span>
        <span>🔴 Overdue</span>
      </div>
    </div>
  );
}
