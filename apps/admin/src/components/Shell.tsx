import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IconOverview, IconUsers, IconImage, IconFlag, IconCog, IconSignOut, IconCar } from "./Icons";
import { fetchAdminStats } from "../lib/api";
import { signOut } from "../lib/auth";

type ShellProps = { adminEmail: string | null };

export function Shell({ adminEmail }: ShellProps) {
  // Lightweight fetch so the sidebar can show the open-reports badge.
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: fetchAdminStats });

  const localPart = (adminEmail ?? "A").split("@")[0] ?? "A";
  const initials =
    localPart
      .split(/[._-]/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "A";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="mark">H</div>
          <div>
            <div className="label">Hot Wheels</div>
            <div className="title">Spotter Admin</div>
          </div>
        </div>

        <div className="nav-section">Overview</div>
        <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <span className="icon"><IconOverview /></span> Dashboard
        </NavLink>

        <div className="nav-section">Manage</div>
        <NavLink to="/users" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <span className="icon"><IconUsers /></span> Users
        </NavLink>
        <NavLink to="/catalog" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <span className="icon"><IconCar /></span> Catalog
        </NavLink>
        <NavLink to="/content" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <span className="icon"><IconImage /></span> Content
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <span className="icon"><IconFlag /></span> Reports
          {stats.data && stats.data.reports_open > 0 ? (
            <span className="badge">{stats.data.reports_open}</span>
          ) : null}
        </NavLink>

        <div className="nav-section">System</div>
        <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          <span className="icon"><IconCog /></span> Settings
        </NavLink>

        <div className="spacer" />

        <div className="user-card">
          <div className="avatar">{initials}</div>
          <div className="info">
            <div className="name">{adminEmail ?? "—"}</div>
            <div className="role">Administrator</div>
          </div>
          <button className="btn icon ghost" onClick={() => void signOut()} title="Sign out" aria-label="Sign out">
            <IconSignOut />
          </button>
        </div>
      </aside>

      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
