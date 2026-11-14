-- Migration 0002: Create Player Settings table
CREATE TABLE IF NOT EXISTS public.player_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  music_enabled BOOLEAN NOT NULL DEFAULT true,
  graphics_quality TEXT NOT NULL DEFAULT 'high' CHECK (graphics_quality IN ('low', 'medium', 'high', 'ultra')),
  show_tutorials BOOLEAN NOT NULL DEFAULT true,
  simulation_speed NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  units TEXT NOT NULL DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
  custom_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

