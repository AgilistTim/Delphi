import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { LandingPage } from "./pages/Landing";
import { SignInPage } from "./pages/SignIn";
import { DashboardPage } from "./pages/Dashboard";
import { NewDecisionPage } from "./pages/NewDecision";
import { SettingsPage } from "./pages/Settings";
import { SessionPage } from "./pages/Session";
import { AdminLayout } from "./pages/admin/Layout";
import { AdminOverview } from "./pages/admin/Overview";
import { AdminRuns } from "./pages/admin/Runs";
import { AdminUsers } from "./pages/admin/Users";
import { Router, Routes } from "./lib/router";

const routes = [
  { path: "/", element: <LandingPage /> },
  { path: "/sign-in", element: <SignInPage /> },
  {
    path: "/app",
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: "", element: <DashboardPage /> },
      { path: "new", element: <NewDecisionPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "s/:id", element: <SessionPage /> },
      {
        path: "admin",
        element: <AdminLayout />,
        children: [
          { path: "", element: <AdminOverview /> },
          { path: "runs", element: <AdminRuns /> },
          { path: "users", element: <AdminUsers /> },
        ],
      },
    ],
  },
];

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes routes={routes} />
      </AuthProvider>
    </Router>
  );
}
