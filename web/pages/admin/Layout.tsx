import { NavLink, Outlet, Navigate } from "../../lib/router";
import { useAuth } from "../../components/AuthProvider";

const ADMIN_EMAIL = "tim@agilist.co.uk";

export function AdminLayout() {
  const { user } = useAuth();

  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <NavLink to="/app/admin" end className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}>
          Overview
        </NavLink>
        <NavLink to="/app/admin/runs" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}>
          Runs
        </NavLink>
        <NavLink to="/app/admin/users" className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}>
          Users
        </NavLink>
      </nav>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
