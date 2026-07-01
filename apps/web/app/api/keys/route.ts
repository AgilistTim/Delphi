import { NextResponse } from "next/server";
import { saveUserKey, getUserKey, deleteUserKey } from "../../lib/keys";
import { getUser } from "../../lib/supabase/server";

/** GET /api/keys — returns whether the user has a key on record (never the raw value). */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = await getUserKey();
  return NextResponse.json({
    has_key: key !== null,
    masked: key ? `sk-ant-…${key.slice(-4)}` : null
  });
}

/** POST /api/keys — saves (or replaces) the user's Anthropic API key. */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const key: string = body.key ?? "";

  if (!key.startsWith("sk-ant-") || key.length < 20) {
    return NextResponse.json(
      { error: "That doesn't look like a valid Anthropic key (expected sk-ant-…)" },
      { status: 400 }
    );
  }

  try {
    await saveUserKey(key);
    return NextResponse.json({ ok: true, masked: `sk-ant-…${key.slice(-4)}` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 }
    );
  }
}

/** DELETE /api/keys — removes the user's stored key. */
export async function DELETE() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteUserKey();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
