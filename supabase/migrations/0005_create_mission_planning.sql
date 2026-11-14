-- Migration 0005: Create Mission Planning Table
CREATE TABLE IF NOT EXISTS public.mission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  selected_window_id TEXT NOT NULL,
  selected_destination_orbit TEXT NOT NULL,
  trajectory_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  planned_maneuvers JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_reserve_delta_v NUMERIC(8,2) NOT NULL DEFAULT 150.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_mission_plans_user ON public.mission_plans(user_id);

