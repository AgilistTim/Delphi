import React from 'react';
import "./globals.css";

export const metadata = {
  title: "DelphiAgent Dashboard",
  description: "Manage and review Delphi runs, history, and artifacts"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
        <header style={{ borderBottom: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700 }}>🧠 DelphiAgent</span>
          <nav style={{ display: "flex", gap: 12, marginLeft: 8 }}>
            <a href="/" style={{ color: "#111827", textDecoration: "none" }}>Dashboard</a>
          </nav>
        </header>
        <main style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>{children}</main>
        <footer style={{ borderTop: "1px solid #e5e7eb", padding: "12px 16px", marginTop: 24, color: "#6b7280", fontSize: 12 }}>
          DelphiAgent Dashboard • MVP
        </footer>
      </body>
    </html>
  );
}
