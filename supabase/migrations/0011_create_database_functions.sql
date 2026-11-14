-- Migration 0011: Database Functions and Triggers

-- Trigger function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_player_profiles_updated_at
  BEFORE UPDATE ON public.player_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_player_settings_updated_at
  BEFORE UPDATE ON public.player_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_campaign_missions_updated_at
  BEFORE UPDATE ON public.campaign_missions
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_campaign_progress_updated_at
  BEFORE UPDATE ON public.campaign_progress
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_spacecraft_designs_updated_at
  BEFORE UPDATE ON public.spacecraft_designs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_mission_plans_updated_at
  BEFORE UPDATE ON public.mission_plans
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_mission_runs_updated_at
  BEFORE UPDATE ON public.mission_runs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Safe player bootstrap function (Called on anonymous sign-up or initial login)
CREATE OR REPLACE FUNCTION public.bootstrap_player_profile(p_user_id UUID, p_commander_name TEXT DEFAULT 'Alex Mercer')
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Insert or ignore player profile
  INSERT INTO public.player_profiles (user_id, commander_name)
  VALUES (p_user_id, COALESCE(p_commander_name, 'Alex Mercer'))
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert or ignore default settings
  INSERT INTO public.player_settings (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert initial campaign progression
  INSERT INTO public.campaign_progress (user_id, active_mission_id, campaign_progress, unlocked_mission_ids)
  VALUES (p_user_id, 'lunar-explorer', 0.0, ARRAY['lunar-explorer'])
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert initial 3 campaign mission entries
  INSERT INTO public.campaign_missions (user_id, mission_id, status)
  VALUES 
    (p_user_id, 'lunar-explorer', 'available'),
    (p_user_id, 'earth-observer', 'locked'),
    (p_user_id, 'mars-pathfinder', 'locked')
  ON CONFLICT (user_id, mission_id) DO NOTHING;

  SELECT * INTO v_profile FROM public.player_profiles WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'commander_name', v_profile.commander_name,
    'credits', v_profile.credits,
    'xp', v_profile.xp,
    'level', v_profile.level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

