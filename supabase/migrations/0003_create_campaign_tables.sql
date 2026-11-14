-- Migration 0003: Create Campaign Tables
CREATE TABLE IF NOT EXISTS public.campaign_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL CHECK (mission_id IN ('lunar-explorer', 'earth-observer', 'mars-pathfinder')),
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in-progress', 'completed', 'failed')),
  completion_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  best_score INTEGER DEFAULT NULL CHECK (best_score IS NULL OR best_score >= 0),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, mission_id)
);

CREATE TABLE IF NOT EXISTS public.campaign_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_mission_id TEXT DEFAULT 'lunar-explorer',
  campaign_progress NUMERIC(5,2) NOT NULL DEFAULT 0.0 CHECK (campaign_progress >= 0 AND campaign_progress <= 100),
  unlocked_mission_ids TEXT[] NOT NULL DEFAULT ARRAY['lunar-explorer']::text[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_campaign_missions_user ON public.campaign_missions(user_id);

