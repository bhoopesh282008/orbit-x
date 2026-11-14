-- Migration 0001: Create Player Profiles table
CREATE TABLE IF NOT EXISTS public.player_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  commander_name TEXT NOT NULL DEFAULT 'Alex Mercer',
  title TEXT NOT NULL DEFAULT 'Flight Director Candidate',
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  xp_to_next_level INTEGER NOT NULL DEFAULT 1000 CHECK (xp_to_next_level > 0),
  credits INTEGER NOT NULL DEFAULT 150000 CHECK (credits >= 0),
  total_missions INTEGER NOT NULL DEFAULT 0 CHECK (total_missions >= 0),
  completed_missions INTEGER NOT NULL DEFAULT 0 CHECK (completed_missions >= 0),
  success_rate NUMERIC(5,2) NOT NULL DEFAULT 0.0 CHECK (success_rate >= 0 AND success_rate <= 100),
  total_discoveries INTEGER NOT NULL DEFAULT 0 CHECK (total_discoveries >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_player_profiles_created ON public.player_profiles(created_at);

