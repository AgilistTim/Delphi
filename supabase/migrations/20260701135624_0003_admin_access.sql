/*
# Admin access for tim@agilist.co.uk

## Summary
Adds a helper function `is_admin()` that returns true if the current user's
email matches the admin email. Then adds SELECT policies on `runs` and
`user_keys` so the admin can view all rows for the admin dashboard.

## Security
- Only the specific admin email gets cross-user read access.
- No write access is granted.
- The function is SECURITY DEFINER with search_path set to prevent injection.
*/

-- Helper: returns true if the current session belongs to the admin
CREATE OR REPLACE FUNCTION public.is_admin()
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

-- Admin can read ALL runs (not just their own)
DROP POLICY IF EXISTS "admin_select_all_runs" ON public.runs;
CREATE POLICY "admin_select_all_runs" ON public.runs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admin can read ALL user_keys (to see who has keys configured)
DROP POLICY IF EXISTS "admin_select_all_keys" ON public.user_keys;
CREATE POLICY "admin_select_all_keys" ON public.user_keys
  FOR SELECT TO authenticated
  USING (public.is_admin());
