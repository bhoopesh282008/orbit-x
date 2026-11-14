import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { ensureAuthenticatedSession } from './authService'
import type { SpacecraftDesignDTO, MissionPlanDTO } from './backendTypes'

/**
 * Persists and retrieves spacecraft designs to/from Supabase with offline fallback
 */
export async function saveSpacecraftDesignCloud(design: SpacecraftDesignDTO) {
  if (!isSupabaseConfigured || !supabase) return null

  try {
    const user = await ensureAuthenticatedSession()
    if (!user) return null

    const { data, error } = await supabase
      .from('spacecraft_designs')
      .insert({
        user_id: user.id,
        mission_id: design.mission_id,
        design_name: design.design_name || 'Custom Flight Configuration',
        selected_components: design.selected_components,
        launch_vehicle_id: design.launch_vehicle_id,
        calculated_metrics: design.calculated_metrics || {},
      })
      .select()
      .single()

    if (error) {
      console.warn('[ORBIT-X Backend] Spacecraft design save error:', error.message)
      return null
    }

    return data
  } catch (err) {
    console.warn('[ORBIT-X Backend] Spacecraft save exception:', err)
    return null
  }
}

export async function loadLatestSpacecraftDesignCloud(missionId: string) {
  if (!isSupabaseConfigured || !supabase) return null

  try {
    const user = await ensureAuthenticatedSession()
    if (!user) return null

    const { data, error } = await supabase
      .from('spacecraft_designs')
      .select('*')
      .eq('user_id', user.id)
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return null
    return data
  } catch (_) {
    return null
  }
}

/**
 * Persists mission plans to Supabase
 */
export async function saveMissionPlanCloud(plan: MissionPlanDTO) {
  if (!isSupabaseConfigured || !supabase) return null

  try {
    const user = await ensureAuthenticatedSession()
    if (!user) return null

    const { data, error } = await supabase
      .from('mission_plans')
      .upsert({
        user_id: user.id,
        mission_id: plan.mission_id,
        selected_window_id: plan.selected_window_id,
        selected_destination_orbit: plan.selected_destination_orbit,
        trajectory_plan: plan.trajectory_plan,
        planned_maneuvers: plan.planned_maneuvers,
        user_reserve_delta_v: plan.user_reserve_delta_v,
      })
      .select()
      .single()

    if (error) return null
    return data
  } catch (_) {
    return null
  }
}

