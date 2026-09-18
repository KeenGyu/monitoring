import type { ActivityEvent, ActivityType } from "../types";
import { useApp } from "../store";
import { EmptyState } from "../components/EmptyState";
import { formatDateTime } from "../lib/dates";
import "./ActivityPage.css";

const ICON_BY_TYPE: Record<ActivityType, string> = {
  created: "\ud83d\udccb",
  "status-changed": "\ud83d\udd04",
  submitted: "\u2705",
  "proof-added": "\ud83d\udcf8",
  "proof-removed": "\ud83d\uddd1\ufe0f",
  edited: "\u270f\ufe0f",
  deleted: "\ud83d\uddc3\ufe0f",
};

function groupByDay(events: ActivityEvent[]): { day: string; items: ActivityEvent[] }[] {
  const groups: { day: string; items: ActivityEvent[] }[] = [];
  for (const event of events) {
    const day = new Date(event.timestamp).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.items.push(event);
    } else {
      groups.push({ day, items: [event] });
    }
  }
  return groups;
}

export function ActivityPage() {
  const { activity } = useApp();
  const groups = groupByDay(activity);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Activity</h1>
        <p className="page-subtitle">Everything that's happened, newest first.</p>
      </header>

      {activity.length === 0 ? (
        <EmptyState
          icon="\u25f7"
          title="No activity yet."
          subtitle="Actions on your reports — created, submitted, edited — will show up here."
        />
      ) : (
        <div className="activity-timeline">
          {groups.map((group) => (
            <div key={group.day} className="activity-day-group">
              <div className="activity-day-label">{group.day}</div>
              <div className="activity-day-items">
                {group.items.map((event) => (
                  <div key={event.id} className="activity-row card">
                    <span className="activity-icon" aria-hidden="true">
                      {ICON_BY_TYPE[event.type]}
                    </span>
                    <div className="activity-content">
                      <div className="activity-line">
                        <span className="activity-report">{event.reportName}</span>
                        <span className="activity-message">{event.message}</span>
                      </div>
                      {event.detail ? (
                        <div className="activity-detail">{event.detail}</div>
                      ) : null}
                    </div>
                    <span className="activity-time">
                      {formatDateTime(event.timestamp).split("\u2014")[1]?.trim() ??
                        formatDateTime(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
