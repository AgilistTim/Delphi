import { NextResponse } from "next/server";

// Phase 1 stub — persists to Supabase and notifies Tim via Resend in a later PR
// per Delphi Hosted Build Brief §6 (PR 3).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  console.log("[access-request]", body);
  return NextResponse.json({ ok: true, ref: `DLPH-${Math.floor(Math.random() * 9000) + 1000}` });
}
