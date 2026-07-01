import { createClient, isSupabaseConfigured } from "./supabase/server";

/** True if the current user has a key on record (safe to call from server components). */
export async function hasUserKey(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createClient();
  const { data } = await supabase
    .from("user_keys")
    .select("user_id")
    .maybeSingle();
  return data !== null;
}

/**
 * Returns the raw Anthropic key for the current user.
 * Only call this server-side to pass to the engine — never send the value to the browser.
 */
export async function getUserKey(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("user_keys")
    .select("anthropic_key")
    .maybeSingle();
  return data?.anthropic_key ?? null;
}

/** Upserts the user's API key. */
export async function saveUserKey(key: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("user_keys")
    .upsert({ anthropic_key: key }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/** Removes the user's stored key. */
export async function deleteUserKey(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("user_keys").delete().neq("user_id", "");
  if (error) throw new Error(error.message);
}
