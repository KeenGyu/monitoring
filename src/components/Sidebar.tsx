import { useState } from "react";
import { useApp } from "../store";
import { EditProfileModal } from "./EditProfileModal";
import "./Sidebar.css";

export type Page = "dashboard" | "reports" | "monitoring" | "absentees" | "activity" | "data" | "salary";

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "reports", label: "Reports", icon: "▤" },
  { id: "monitoring", label: "3-Month Monitoring", icon: "▦" },
  { id: "absentees", label: "Absentees", icon: "⚑" },
  { id: "salary", label: "Salary", icon: "₱" },
  { id: "activity", label: "Activity", icon: "◷" },
  { id: "data", label: "Data", icon: "⇅" },
];

// The tab bar only has room for a few items before it gets cramped on a
// phone screen. These three stay visible; everything else lives behind
// the "More" tab as a sheet.
const PRIMARY_IDS: Page[] = ["dashboard", "reports", "absentees"];
const PRIMARY_NAV = NAV.filter((item) => PRIMARY_IDS.includes(item.id));
const MORE_NAV = NAV.filter((item) => !PRIMARY_IDS.includes(item.id));

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Shared profile block: avatar + name + role, tap to edit. Used by both
 * the desktop sidebar and the mobile header. */
function ProfileBlock({ className }: { className: string }) {
  const { settings, updateProfile } = useApp();
  const [editing, setEditing] = useState(false);
  const { name, role } = settings.profile;

  return (
    <>
      <button
        type="button"
        className={`profile-block ${className}`}
        onClick={() => setEditing(true)}
        aria-label="Edit profile"
      >
        <span className="profile-avatar" aria-hidden="true">
          {initials(name)}
        </span>
        <div className="profile-info">
          <div className="profile-name">{name || "Add your name"}</div>
          <div className="profile-role">{role || "Add your position"}</div>
        </div>
        <span className="profile-edit-icon" aria-hidden="true">
          ✎
        </span>
      </button>

      {editing ? (
        <EditProfileModal
          initialName={name}
          initialRole={role}
          onSave={(newName, newRole) => {
            updateProfile(newName, newRole);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </>
  );
}

interface SidebarProps {
  current: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true">
          ◈
        </span>
        <div>
          <div className="brand-title">QMS Work Monitor</div>
          <div className="brand-subtitle">Personal tracking</div>
        </div>
      </div>
      <ul className="sidebar-nav">
        {NAV.map((item) => (
          <li key={item.id}>
            <button
              className={`sidebar-link ${current === item.id ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={current === item.id ? "page" : undefined}
            >
              <span className="sidebar-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-profile">
        <ProfileBlock className="" />
      </div>
      <div className="sidebar-footer">Stored locally on this device.</div>
    </nav>
  );
}

export function MobileHeader() {
  return (
    <div className="mobile-header">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true">
          ◈
        </span>
        <div>
          <div className="brand-title">QMS Work Monitor</div>
          <div className="brand-subtitle">Personal tracking</div>
        </div>
      </div>
      <ProfileBlock className="mobile-header-profile" />
    </div>
  );
}

export function MobileTabBar({ current, onNavigate }: SidebarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = MORE_NAV.some((item) => item.id === current);

  function go(page: Page) {
    setMoreOpen(false);
    onNavigate(page);
  }

  return (
    <>
      {moreOpen ? (
        <div className="more-sheet-overlay" onMouseDown={() => setMoreOpen(false)}>
          <div
            className="more-sheet"
            role="menu"
            aria-label="More navigation options"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {MORE_NAV.map((item) => (
              <button
                key={item.id}
                className={`more-sheet-item ${current === item.id ? "active" : ""}`}
                onClick={() => go(item.id)}
                role="menuitem"
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <nav className="tabbar" aria-label="Primary">
        {PRIMARY_NAV.map((item) => (
          <button
            key={item.id}
            className={`tabbar-link ${current === item.id ? "active" : ""}`}
            onClick={() => go(item.id)}
            aria-current={current === item.id ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span className="tabbar-label">{item.label.split(" ")[0]}</span>
          </button>
        ))}
        <button
          className={`tabbar-link ${isMoreActive || moreOpen ? "active" : ""}`}
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
        >
          <span aria-hidden="true">⋯</span>
          <span className="tabbar-label">More</span>
        </button>
      </nav>
    </>
  );
}