import { NavLink } from "react-router-dom";

type SimplePageProps = {
  title: string;
  message: string;
};

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "◫" },
  { to: "/song-library", label: "Song library", icon: "♫" },
  { to: "/wedding-events", label: "Wedding Events", icon: "◈" },
  { to: "/event-folder", label: "Event Folder", icon: "⌂" },
];

export function SimplePage({ title, message }: SimplePageProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <span className="sidebar__brandMark" aria-hidden>
              ◉
            </span>
          </div>
          <div>
            <div className="sidebar__title">Management System</div>
            <div className="sidebar__subtitle">WeddingSong</div>
          </div>
        </div>
        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/wedding-events"}
              className={({ isActive }) => `sidebar__item${isActive ? " sidebar__item--active" : ""}`}
            >
              <span className="sidebar__itemInner">
                <span className="sidebar__itemIcon" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__spacer" />
        <NavLink
          to="/wedding-events/new-wedding"
          className={({ isActive }) => `sidebar__cta${isActive ? " sidebar__cta--active" : ""}`}
        >
          + New wedding
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar__item${isActive ? " sidebar__item--active" : ""}`}>
          <span className="sidebar__itemInner">
            <span className="sidebar__itemIcon" aria-hidden>
              ⚙
            </span>
            <span>Settings</span>
          </span>
        </NavLink>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="breadcrumbs">{title}</div>
          <div className="topbar__tools">
            <input className="search" placeholder="Search events..." readOnly />
            <div className="iconBtn" aria-label="Notifications">
              🔔
            </div>
            <div className="avatar" aria-label="Profile" />
          </div>
        </header>

        <main className="main">
          <h1 className="h1">{title}</h1>
          <p className="lede">{message}</p>
        </main>
      </div>
    </div>
  );
}
