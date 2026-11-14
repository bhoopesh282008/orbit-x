-- Migration 0004: Create Spacecraft Tables
CREATE TABLE IF NOT EXISTS public.spacecraft_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  design_name TEXT NOT NULL DEFAULT 'Custom Spacecraft Design',
  selected_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  launch_vehicle_id TEXT DEFAULT NULL,
  calculated_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  catalog_version TEXT NOT NULL DEFAULT 'v1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_spacecraft_designs_user_mission ON public.spacecraft_designs(user_id, mission_id);

