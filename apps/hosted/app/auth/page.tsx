"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "../components/Logo";

export default function AuthPage() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace("/app"), 900);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <div className="shell center" style={{ maxWidth: 420, marginTop: 120 }}>
      <Logo small />
      <h2 style={{ marginTop: 30 }}>Signing you in…</h2>
      <div className="bar" style={{ margin: "14px auto", maxWidth: 220 }}>
        <div className="fill" style={{ width: "70%" }} />
      </div>
      <div className="mono" style={{ fontSize: 10 }}>
        redirecting to dashboard
      </div>
    </div>
  );
}
