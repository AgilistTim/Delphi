import { NextResponse } from "next/server";

// Phase 1 stub — Supabase magic-link + Resend email in PR 2.
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({ email: "" }));
  console.log("[magic-link]", email);
  return NextResponse.json({ ok: true });
}
