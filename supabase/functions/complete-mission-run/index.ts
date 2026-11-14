import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { getAuthenticatedUser, getServiceClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const userResult = await getAuthenticatedUser(req)
    if (!userResult || !userResult.data.user) {
      return errorResponse('Unauthorized', 'UNAUTHORIZED', 401)
    }

    const user = userResult.data.user
    const supabase = getServiceClient()
    const { runId, missionId, outcome, score, totalCost, scientificData, remainingFuel, finalBattery, objectivesCompleted, totalObjectives, achievements, timeline, recommendations } = await req.json()

    if (!runId || !missionId) {
      return errorResponse('Run ID and Mission ID are required', 'VALIDATION_ERROR', 400)
    }

    // 1. Insert authoritative mission result
    const { data: resultData, error: resultError } = await supabase
      .from('mission_results')
      .upsert({
        user_id: user.id,
        mission_run_id: runId,
        mission_id: missionId,
        outcome: outcome || 'success',
        completion_percentage: 100.0,
        objectives_completed: objectivesCompleted || 4,
        total_objectives: totalObjectives || 4,
        score: score || 95,
        scientific_data: scientificData || 120,
        total_cost: totalCost || 85000,
        remaining_fuel: remainingFuel || 25,
        final_battery: finalBattery || 80,
        communication_score: 95,
        health_score: 90,
        engineering_efficiency: 92,
        budget_efficiency: 88,
        achievements: achievements || [],
        recommendations: recommendations || [],
        timeline: timeline || [],
        verification_status: 'VERIFIED_AUTHORITATIVE',
      })
      .select()
      .single()

    if (resultError) {
      return errorResponse(resultError.message, 'DATABASE_ERROR', 500)
    }

    // 2. Mark mission run completed
    await supabase
      .from('mission_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)
      .eq('user_id', user.id)

    // 3. Update campaign mission status to completed
    await supabase
      .from('campaign_missions')
      .update({
        status: 'completed',
        completion_percentage: 100.0,
        best_score: score || 95,
        completed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('mission_id', missionId)

    // 4. Unlock next mission in sequence
    let nextMissionId: string | null = null
    if (missionId === 'lunar-explorer') nextMissionId = 'earth-observer'
    if (missionId === 'earth-observer') nextMissionId = 'mars-pathfinder'

    if (nextMissionId) {
      await supabase
        .from('campaign_missions')
        .update({ status: 'available' })
        .eq('user_id', user.id)
        .eq('mission_id', nextMissionId)
        .eq('status', 'locked')

      // Update progress
      const { data: progressRow } = await supabase
        .from('campaign_progress')
        .select('unlocked_mission_ids')
        .eq('user_id', user.id)
        .single()

      const unlocked = progressRow?.unlocked_mission_ids || ['lunar-explorer']
      if (!unlocked.includes(nextMissionId)) {
        unlocked.push(nextMissionId)
      }

      const progressPercent = missionId === 'lunar-explorer' ? 33.3 : missionId === 'earth-observer' ? 66.6 : 100.0

      await supabase
        .from('campaign_progress')
        .update({
          active_mission_id: nextMissionId,
          campaign_progress: progressPercent,
          unlocked_mission_ids: unlocked,
        })
        .eq('user_id', user.id)
    }

    // 5. Award XP and Credits on player profile
    const xpReward = missionId === 'mars-pathfinder' ? 1200 : missionId === 'earth-observer' ? 800 : 500
    const creditsReward = missionId === 'mars-pathfinder' ? 150000 : missionId === 'earth-observer' ? 90000 : 50000

    const { data: profile } = await supabase
      .from('player_profiles')
      .select('xp, credits, completed_missions, total_missions')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      const newXp = profile.xp + xpReward
      const newCredits = profile.credits + creditsReward
      const newCompleted = profile.completed_missions + 1
      const newTotal = profile.total_missions + 1
      const newRate = (newCompleted / newTotal) * 100

      await supabase
        .from('player_profiles')
        .update({
          xp: newXp,
          credits: newCredits,
          completed_missions: newCompleted,
          total_missions: newTotal,
          success_rate: newRate,
        })
        .eq('user_id', user.id)
    }

    return jsonResponse({
      success: true,
      data: resultData,
    })
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500)
  }
})

