/*
# Add user_keys table for BYOK (Bring Your Own Key)

## Summary
Adds a `user_keys` table that stores each user's Anthropic API key so the
Delphi engine can run deliberations using the user's own billing account instead
of a shared server key.

## New Tables

### user_keys
Each row stores one user's Anthropic API key. The `user_id` column is both the
primary key and a foreign key to `auth.users`, so each user can have at most one
key on record.

Columns:
- `user_id`       uuid  Primary key; defaults to auth.uid() so inserts from
                        authenticated clients don't need to pass it explicitly.
- `anthropic_key` text  The raw API key (protected by RLS — only the owning
                        user and the service-role can read it).
- `created_at`    timestamptz  When the key was first saved.
- `updated_at`    timestamptz  Updated on every upsert.

## Security

- RLS enabled; four separate policies (select / insert / update / delete).
- All policies are scoped `TO authenticated` with `auth.uid() = user_id`.
- The key is never readable by another user, and never readable by the anon role.
- Server-side routes that need to forward the key to the engine use the
  service-role client (bypasses RLS), but that code never sends the raw key
  back to the browser.

## Notes

1. The `pgcrypto` extension is already enabled in migration 0001.
2. The `DEFAULT auth.uid()` on `user_id` means a client insert of just
   `{ anthropic_key: "sk-ant-…" }` satisfies `WITH CHECK (auth.uid() = user_id)`.
3. Use UPSERT (`onConflict: user_id`) for updates — the row is updated in place.
*/

CREATE TABLE IF NOT EXISTS public.user_keys (
  user_id       uuid        PRIMARY KEY DEFAULT auth.uid()
                              REFERENCES auth.users (id) ON DELETE CASCADE,
  anthropic_key text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_key" ON public.user_keys;
CREATE POLICY "select_own_key" ON public.user_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_key" ON public.user_keys;
CREATE POLICY "insert_own_key" ON public.user_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_key" ON public.user_keys;
CREATE POLICY "update_own_key" ON public.user_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_key" ON public.user_keys;
CREATE POLICY "delete_own_key" ON public.user_keys
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
