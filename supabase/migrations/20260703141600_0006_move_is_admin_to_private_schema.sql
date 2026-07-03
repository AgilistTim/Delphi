-- Move is_admin() to a private schema so PostgREST does not expose it
-- via /rest/v1/rpc/is_admin, while still allowing RLS policies to call it.

-- 1. Create a private schema (not exposed by PostgREST)
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Create the function in the private schema
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND email = 'tim@agilist.co.uk'
  );
$$;

-- 3. Grant execute to authenticated so RLS policies can evaluate it
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- 4. Update RLS policies to use private.is_admin()
DROP POLICY IF EXISTS "admin_select_all_runs" ON public.runs;
CREATE POLICY "admin_select_all_runs" ON public.runs
  FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "admin_select_all_keys" ON public.user_keys;
CREATE POLICY "admin_select_all_keys" ON public.user_keys
  FOR SELECT TO authenticated
  USING (private.is_admin());

-- 5. Drop the public version (no longer needed)
DROP FUNCTION IF EXISTS public.is_admin();
