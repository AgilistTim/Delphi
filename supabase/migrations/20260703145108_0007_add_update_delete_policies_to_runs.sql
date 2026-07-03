/*
# Add UPDATE and DELETE RLS policies to runs table

1. Security Changes
   - Add UPDATE policy: authenticated users can update their own runs (status, error, completed_at)
   - Add DELETE policy: authenticated users can delete their own runs
   - These enable the "stop run" and "delete run" features from the frontend

2. Important Notes
   - Only rows owned by the current user (auth.uid() = user_id) can be modified or deleted
   - The engine still writes via service-role key (bypasses RLS) for normal operation
*/

DROP POLICY IF EXISTS "runs_update" ON public.runs;
CREATE POLICY "runs_update" ON public.runs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "runs_delete" ON public.runs;
CREATE POLICY "runs_delete" ON public.runs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
