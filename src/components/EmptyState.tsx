import type { ReactNode } from "react";
import "./EmptyState.css";

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "◈", title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="empty-title">{title}</h3>
      {subtitle ? <p className="empty-subtitle">{subtitle}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
