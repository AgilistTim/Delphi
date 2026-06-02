import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin">
      <div className="shell shell-wide">
        <div className="topbar" style={{ borderBottomColor: "var(--admin-rule)" }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, fontWeight: 700 }}>
            delphi · <span style={{ color: "var(--accent)" }}>admin</span>
          </div>
          <nav className="admin-nav">
            <Link href="/admin/queue">queue</Link>
            <Link href="/admin/usage">usage</Link>
            <Link href="/admin/sessions/4f2a">sessions</Link>
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}
