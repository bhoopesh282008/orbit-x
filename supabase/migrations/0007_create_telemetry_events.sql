-- Migration 0007: Create Telemetry, Events & Command Tables
CREATE TABLE IF NOT EXISTS public.mission_run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_run_id UUID NOT NULL REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'ANOMALY',
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  simulation_time_seconds NUMERIC(10,2) NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  available_choices JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_choice_id TEXT DEFAULT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS public.flight_commands_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_run_id UUID NOT NULL REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  command_id TEXT NOT NULL,
  subsystem TEXT NOT NULL,
  issued_at_sim_seconds NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'TRANSMITTING', 'EXECUTING', 'ACKNOWLEDGED', 'REJECTED')),
  response_message TEXT DEFAULT NULL,
  resulting_state_snapshot JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.mission_telemetry_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_run_id UUID NOT NULL REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  simulation_time_seconds NUMERIC(10,2) NOT NULL,
  telemetry JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_events_run ON public.mission_run_events(mission_run_id);
CREATE INDEX IF NOT EXISTS idx_commands_run ON public.flight_commands_log(mission_run_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_run ON public.mission_telemetry_snapshots(mission_run_id, simulation_time_seconds);

