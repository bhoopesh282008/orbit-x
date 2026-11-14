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
    const { runId, currentPhase, currentPhaseIndex, simulationTimeSeconds, simulationState, telemetrySnapshot } = await req.json()

    if (!runId) {
      return errorResponse('Mission Run ID required', 'VALIDATION_ERROR', 400)
    }

    // Update mission run checkpoint
    const { data: updatedRun, error } = await supabase
      .from('mission_runs')
      .update({
        current_phase: currentPhase,
        current_phase_index: currentPhaseIndex,
        simulation_time_seconds: simulationTimeSeconds,
        simulation_state: simulationState || {},
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return errorResponse(error.message, 'DATABASE_ERROR', 500)
    }

    // Optional telemetry snapshot insert
    if (telemetrySnapshot) {
      await supabase.from('mission_telemetry_snapshots').insert({
        user_id: user.id,
        mission_run_id: runId,
        simulation_time_seconds: simulationTimeSeconds || 0,
        telemetry: telemetrySnapshot,
      })
    }

    return jsonResponse({
      success: true,
      data: updatedRun,
    })
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500)
  }
})

