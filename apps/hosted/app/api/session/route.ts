import { NextResponse } from "next/server";

// Phase 1 stub — wires to the engine adapter with token cap enforcement in PR 5.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  console.log("[session:start]", body);
  const id = Math.random().toString(16).slice(2, 6);
  return NextResponse.json({ ok: true, id });
}
