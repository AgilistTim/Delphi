-- Revoke direct execute access to is_admin() from anon and authenticated roles.
-- The function is still usable internally by RLS policies (which run as the
-- policy definer context), but cannot be called via /rest/v1/rpc/is_admin.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated, public;
