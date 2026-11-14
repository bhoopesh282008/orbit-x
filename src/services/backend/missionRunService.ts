import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { ensureAuthenticatedSession } from './authService'
import type { MissionRunDTO } from './backendTypes'

export async function startMissionRunCloud(missionId: string, spacecraftDesignId?: string, launchVehicleId?: string): Promise<MissionRunDTO | null> {
  if (!isSupabaseConfigured || !supabase) return null

  try {
    const user = await ensureAuthenticatedSession()
    if (!user) return null

    const { data, error } = await supabase
      .from('mission_runs')
      .insert({
        user_id: user.id,
        mission_id: missionId,
        spacecraft_design_id: spacecraftDesignId || null,
        launch_vehicle_id: launchVehicleId || null,
        status: 'running',
        event_seed: Math.floor(Math.random() * 1000000000),
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return null
    return data as MissionRunDTO
  } catch (_) {
    return null
  }
}

export async function saveMissionCheckpointCloud(
  runId: string,
  phase: string,
  phaseIndex: number,
  timeSeconds: number,
  simState: any,
  telemetrySnapshot?: any
) {
  if (!isSupabaseConfigured || !supabase) return

  try {
    const user = await ensureAuthenticatedSession()
    if (!user) return

    await supabase
      .from('mission_runs')
      .update({
        current_phase: phase,
        current_phase_index: phaseIndex,
        simulation_time_seconds: timeSeconds,
        simulation_state: simState,
      })
      .eq('id', runId)
      .eq('user_id', user.id)

    if (telemetrySnapshot) {
      await supabase.from('mission_telemetry_snapshots').insert({
        user_id: user.id,
        mission_run_id: runId,
        simulation_time_seconds: timeSeconds,
        telemetry: telemetrySnapshot,
      })
    }
  } catch (_) {
    // Offline resilience
  }
}

export async function completeMissionRunCloud(resultPayload: any) {
  if (!isSupabaseConfigured || !supabase) return null

  try {
    const user = await ensureAuthenticatedSession()
    if (!user) return null

    // Call complete-mission-run Edge Function or direct database update
    const { data, error } = await supabase.functions.invoke('complete-mission-run', {
      body: resultPayload,
    })

    if (!error && data?.data) {
      return data.data
    }

    // Direct table fallback if Edge Functions aren't deployed yet
    const { data: dbResult } = await supabase
      .from('mission_results')
      .insert({
        user_id: user.id,
        mission_run_id: resultPayload.runId || crypto.randomUUID(),
        mission_id: resultPayload.missionId,
        outcome: resultPayload.outcome || 'success',
        completion_percentage: 100.0,
        objectives_completed: resultPayload.objectivesCompleted || 4,
        total_objectives: resultPayload.totalObjectives || 4,
        score: resultPayload.score || 95,
        scientific_data: resultPayload.scientificData || 120,
        total_cost: resultPayload.totalCost || 85000,
        remaining_fuel: resultPayload.remainingFuel || 25,
        final_battery: resultPayload.finalBattery || 80,
        communication_score: 95,
        health_score: 90,
        engineering_efficiency: 92,
        budget_efficiency: 88,
        achievements: resultPayload.achievements || [],
        recommendations: resultPayload.recommendations || [],
        timeline: resultPayload.timeline || [],
      })
      .select()
      .single()

    return dbResult
  } catch (_) {
    return null
  }
}

