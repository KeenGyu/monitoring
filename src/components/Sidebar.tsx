import "./Sidebar.css";

export type Page = "dashboard" | "reports" | "monitoring" | "activity" | "data";

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "reports", label: "Reports", icon: "▤" },
  { id: "monitoring", label: "3-Month Monitoring", icon: "▦" },
  { id: "activity", label: "Activity", icon: "◷" },
  { id: "data", label: "Data", icon: "⇅" },
];

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
        <span className="profile-avatar" aria-hidden="true">
          JB
        </span>
        <div className="profile-info">
          <div className="profile-name">Junrics Butas</div>
          <div className="profile-role">QMS Staff</div>
        </div>
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
      <div className="mobile-header-profile">
        <span className="profile-avatar" aria-hidden="true">
          JB
        </span>
        <div className="profile-info">
          <div className="profile-name">Junrics Butas</div>
          <div className="profile-role">QMS Staff</div>
        </div>
      </div>
    </div>
  );
}

export function MobileTabBar({ current, onNavigate }: SidebarProps) {
  return (
    <nav className="tabbar" aria-label="Primary">
      {NAV.map((item) => (
        <button
          key={item.id}
          className={`tabbar-link ${current === item.id ? "active" : ""}`}
          onClick={() => onNavigate(item.id)}
          aria-current={current === item.id ? "page" : undefined}
        >
          <span aria-hidden="true">{item.icon}</span>
          <span className="tabbar-label">{item.label.split(" ")[0]}</span>
        </button>
      ))}
    </nav>
  );
}