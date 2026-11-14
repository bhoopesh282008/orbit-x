-- Migration 0012: Add Age and Custom Profile fields to Player Profiles
ALTER TABLE public.player_profiles 
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 10 AND age <= 120),
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update RLS policy to ensure users can only access their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.player_profiles;
CREATE POLICY "Users can view own profile" ON public.player_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.player_profiles;
CREATE POLICY "Users can insert own profile" ON public.player_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.player_profiles;
CREATE POLICY "Users can update own profile" ON public.player_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

