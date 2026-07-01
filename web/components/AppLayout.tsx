import { NavLink, Outlet } from "../lib/router";
import { useAuth } from "./AuthProvider";

export function AppLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">delphi</div>
        <nav className="sidebar-nav">
          <NavLink to="/app" end className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h5v5H2V2zm7 0h5v5H9V2zM2 9h5v5H2V9zm7 0h5v5H9V9z" stroke="currentColor" strokeWidth="1.5"/></svg>
            Dashboard
          </NavLink>
          <NavLink to="/app/new" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            New Decision
          </NavLink>
          <NavLink to="/app/settings" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5"/><path d="M13.5 8a5.5 5.5 0 01-.3 1.8l1.3 1-1 1.7-1.5-.6a5.5 5.5 0 01-1.5.9L10 14H8l-.5-1.2a5.5 5.5 0 01-1.5-.9l-1.5.6-1-1.7 1.3-1A5.5 5.5 0 014.5 8c0-.6.1-1.2.3-1.8l-1.3-1 1-1.7 1.5.6a5.5 5.5 0 011.5-.9L8 2h2l.5 1.2c.6.2 1 .5 1.5.9l1.5-.6 1 1.7-1.3 1c.2.6.3 1.2.3 1.8z" stroke="currentColor" strokeWidth="1.5"/></svg>
            Settings
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.email}</div>
          <button className="sidebar-signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
