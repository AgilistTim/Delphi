-- Add progress column to track step-by-step engine activity
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS progress jsonb DEFAULT '[]'::jsonb;

-- Allow admin to read progress
-- (existing admin_select_all_runs policy already covers SELECT on all columns)
