import Link from "next/link";

export function Logo({ small, href = "/" }: { small?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        fontFamily: "'Caveat', cursive",
        fontWeight: 700,
        textDecoration: "none",
        color: "inherit"
      }}
    >
      <span style={{ fontSize: small ? 20 : 26, letterSpacing: "0.02em" }}>Delphi</span>
      <span className="mono" style={{ fontSize: 10 }}>
        by Agilist
      </span>
    </Link>
  );
}
