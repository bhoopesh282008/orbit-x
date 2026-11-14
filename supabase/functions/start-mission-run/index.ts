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
    const { missionId, spacecraftDesignId, launchVehicleId, simulationVersion } = await req.json()

    if (!missionId) {
      return errorResponse('Mission ID required to start run', 'VALIDATION_ERROR', 400)
    }

    // Verify campaign unlock state
    const { data: campaignMission } = await supabase
      .from('campaign_missions')
      .select('status')
      .eq('user_id', user.id)
      .eq('mission_id', missionId)
      .single()

    if (campaignMission && campaignMission.status === 'locked') {
      return errorResponse('Mission is currently locked in campaign progression', 'FORBIDDEN', 403)
    }

    const eventSeed = Math.floor(Math.random() * 1000000000)

    const { data: newRun, error } = await supabase
      .from('mission_runs')
      .insert({
        user_id: user.id,
        mission_id: missionId,
        spacecraft_design_id: spacecraftDesignId || null,
        launch_vehicle_id: launchVehicleId || null,
        status: 'running',
        event_seed: eventSeed,
        simulation_version: simulationVersion || 'v2.4.0',
        state_version: 1,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return errorResponse(error.message, 'DATABASE_ERROR', 500)
    }

    return jsonResponse({
      success: true,
      data: newRun,
    })
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500)
  }
})

