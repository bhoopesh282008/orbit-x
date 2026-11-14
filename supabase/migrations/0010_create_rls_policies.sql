-- Migration 0010: Enable Row Level Security and Define Security Policies

-- Enable RLS across all tables
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spacecraft_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_commands_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_telemetry_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spacecraft_component_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_vehicle_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_catalog ENABLE ROW LEVEL SECURITY;

-- 1. Read-Only Global Catalogues (Public read for all authenticated/anon roles)
CREATE POLICY "Allow public read on component catalog" ON public.spacecraft_component_catalog
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read on launch vehicle catalog" ON public.launch_vehicle_catalog
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read on mission catalog" ON public.mission_catalog
  FOR SELECT USING (is_active = true);

-- 2. Player Profiles: users can read & update their own profile
CREATE POLICY "Users can view own profile" ON public.player_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile name and title" ON public.player_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.player_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Player Settings: users have full CRUD on their own settings
CREATE POLICY "Users manage own settings" ON public.player_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Campaign Missions & Progress: users can read their records
CREATE POLICY "Users view own campaign missions" ON public.campaign_missions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own campaign progress" ON public.campaign_progress
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Spacecraft Designs: users have full CRUD on their designs
CREATE POLICY "Users manage own spacecraft designs" ON public.spacecraft_designs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Mission Plans: users have full CRUD on their mission plans
CREATE POLICY "Users manage own mission plans" ON public.mission_plans
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Mission Runs: users can view and update their active runs
CREATE POLICY "Users manage own mission runs" ON public.mission_runs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Run Events, Commands, and Telemetry
CREATE POLICY "Users view and insert run events" ON public.mission_run_events
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users log and view flight commands" ON public.flight_commands_log
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users record and view telemetry" ON public.mission_telemetry_snapshots
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. Mission Results & Achievements: users can view their results & achievements
CREATE POLICY "Users view own mission results" ON public.mission_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own achievements" ON public.player_achievements
  FOR SELECT USING (auth.uid() = user_id);

