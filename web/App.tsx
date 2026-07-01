import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { LandingPage } from "./pages/Landing";
import { SignInPage } from "./pages/SignIn";
import { DashboardPage } from "./pages/Dashboard";
import { NewDecisionPage } from "./pages/NewDecision";
import { SettingsPage } from "./pages/Settings";
import { SessionPage } from "./pages/Session";
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
