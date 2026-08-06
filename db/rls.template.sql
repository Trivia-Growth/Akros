-- RLS Template for Akros
-- Copy this template and adapt to your table's business logic
-- Rule: Every table MUST have RLS FORCE enabled + at least one policy

-- Example 1: Users can only see their own rows
CREATE POLICY "Users can view own rows"
  ON public.table_name
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rows"
  ON public.table_name
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rows"
  ON public.table_name
  FOR DELETE
  USING (auth.uid() = user_id);

-- Example 2: Superadmin can see all rows
CREATE POLICY "Superadmin can view all"
  ON public.table_name
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'superadmin'
    )
  );

-- Example 3: Team members can see team's rows
CREATE POLICY "Team members can view team data"
  ON public.table_name
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

-- IMPORTANT: After creating policies, verify they work
-- Run in Supabase SQL editor to test:
-- SELECT * FROM table_name;  -- as authenticated user
-- SELECT * FROM table_name;  -- as different user (should see nothing if RLS correct)
