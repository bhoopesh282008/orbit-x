-- Migration 0008: Create Results & Achievements Tables
CREATE TABLE IF NOT EXISTS public.mission_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_run_id UUID UNIQUE NOT NULL REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('excellent', 'success', 'partial', 'failure')),
  completion_percentage NUMERIC(5,2) NOT NULL,
  objectives_completed INTEGER NOT NULL,
  total_objectives INTEGER NOT NULL,
  score INTEGER NOT NULL,
  scientific_data NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(12,2) NOT NULL,
  remaining_fuel NUMERIC(5,2) NOT NULL,
  final_battery NUMERIC(5,2) NOT NULL,
  communication_score NUMERIC(5,2) NOT NULL,
  health_score NUMERIC(5,2) NOT NULL,
  engineering_efficiency NUMERIC(5,2) NOT NULL,
  budget_efficiency NUMERIC(5,2) NOT NULL,
  achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'VERIFIED_AUTHORITATIVE' CHECK (verification_status IN ('VERIFIED_AUTHORITATIVE', 'UNVERIFIED', 'FLAGGED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  mission_id TEXT DEFAULT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_results_user ON public.mission_results(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.player_achievements(user_id);

