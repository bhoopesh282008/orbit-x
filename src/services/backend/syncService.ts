import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { ensureAuthenticatedSession } from './authService'
import type { PlayerProfileDTO } from './backendTypes'

/**
 * Initializes and synchronizes player profile and campaign state with Supabase.
 * Respects local-first offline storage and updates seamlessly.
 */
export async function syncPlayerStateCloud() {
  if (!isSupabaseConfigured || !supabase) {
    return { cloudActive: false, profile: null, campaign: null }
  }

  try {
    const user = await ensureAuthenticatedSession()
    if (!user) {
      return { cloudActive: false, profile: null, campaign: null }
    }

    // Call bootstrap endpoint / rpc
    const { data: bootstrapData } = await supabase.rpc('bootstrap_player_profile', {
      p_user_id: user.id,
      p_commander_name: 'Alex Mercer',
    })

    const [profileRes, campaignRes, missionsRes] = await Promise.all([
      supabase.from('player_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('campaign_progress').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('campaign_missions').select('*').eq('user_id', user.id),
    ])

    return {
      cloudActive: true,
      profile: profileRes.data as PlayerProfileDTO | null,
      campaignProgress: campaignRes.data,
      campaignMissions: missionsRes.data || [],
      bootstrapData,
    }
  } catch (err) {
    console.warn('[ORBIT-X Backend] Cloud sync exception:', err)
    return { cloudActive: false, profile: null, campaign: null }
  }
}

export async function resetPlayerProgressCloud() {
  if (!isSupabaseConfigured || !supabase) return

  try {
    const user = await ensureAuthenticatedSession()
    if (!user) return

    // Safely reset user records
    await Promise.all([
      supabase.from('spacecraft_designs').delete().eq('user_id', user.id),
      supabase.from('mission_plans').delete().eq('user_id', user.id),
      supabase.from('mission_runs').delete().eq('user_id', user.id),
      supabase.from('mission_results').delete().eq('user_id', user.id),
      supabase.from('player_achievements').delete().eq('user_id', user.id),
      supabase.from('campaign_missions').update({ status: 'locked', completion_percentage: 0, best_score: null, attempts: 0 }).eq('user_id', user.id),
      supabase.from('campaign_missions').update({ status: 'available' }).eq('user_id', user.id).eq('mission_id', 'lunar-explorer'),
      supabase.from('campaign_progress').update({ active_mission_id: 'lunar-explorer', campaign_progress: 0, unlocked_mission_ids: ['lunar-explorer'] }).eq('user_id', user.id),
      supabase.from('player_profiles').update({ xp: 0, level: 1, credits: 150000, completed_missions: 0, total_missions: 0, success_rate: 0 }).eq('user_id', user.id),
    ])
  } catch (_) {
    // Offline resilience
  }
}

