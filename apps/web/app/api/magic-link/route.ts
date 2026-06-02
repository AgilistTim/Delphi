import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "../../lib/supabase/server";

/**
 * Sends a Supabase magic-link (email OTP). The link redirects back to
 * /auth/callback, which exchanges the code for a session.
 */
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({ email: "" }));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    // Dev fallback: no Supabase configured — accept silently.
    console.log("[magic-link] (no supabase configured)", email);
    return NextResponse.json({ ok: true, dev: true });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true
    }
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
