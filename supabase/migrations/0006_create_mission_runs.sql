-- Migration 0006: Create Mission Runs Table
CREATE TABLE IF NOT EXISTS public.mission_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  spacecraft_design_id UUID REFERENCES public.spacecraft_designs(id) ON DELETE SET NULL,
  launch_vehicle_id TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'completed', 'failed')),
  event_seed BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  simulation_version TEXT NOT NULL DEFAULT 'v2.4.0',
  state_version INTEGER NOT NULL DEFAULT 1,
  current_phase TEXT NOT NULL DEFAULT 'Pre-launch Systems Checkout',
  current_phase_index INTEGER NOT NULL DEFAULT 0,
  simulation_time_seconds NUMERIC(10,2) NOT NULL DEFAULT 0.0,
  simulation_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mission_runs_user ON public.mission_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_runs_status ON public.mission_runs(status);

