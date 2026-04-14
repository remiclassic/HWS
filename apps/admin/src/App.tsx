import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useAuth, signOut } from "./lib/auth";
import LoginPage from "./pages/Login";
import Overview from "./pages/Overview";
import Users from "./pages/Users";
import Catalog from "./pages/Catalog";
import Content from "./pages/Content";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import { Shell } from "./components/Shell";

export default function App() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <div className="center">Loading…</div>;
  }

  if (auth.status === "unauthenticated") {
    return <LoginPage />;
  }

  if (auth.status === "not-admin") {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="kicker" style={{ color: "var(--danger)" }}>Access denied</div>
          <h1 style={{ marginTop: 4, fontSize: 24 }}>Admin only</h1>
          <p className="hint" style={{ marginTop: 12 }}>
            Your account <strong>{auth.email ?? "(unknown)"}</strong> is signed in but does not have the admin flag.
            Ask an existing administrator to set <code>is_admin = true</code> on your profile.
          </p>
          <button className="btn" style={{ marginTop: 20 }} onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell adminEmail={auth.email} />}>
          <Route path="/" element={<Overview />} />
          <Route path="/users" element={<Users />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/content" element={<Content />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
