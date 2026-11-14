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
    const { missionId, selectedWindowId, selectedDestinationOrbit, trajectoryPlan, plannedManeuvers, userReserveDeltaV } = await req.json()

    if (!missionId || !selectedWindowId) {
      return errorResponse('Missing required mission plan data', 'VALIDATION_ERROR', 400)
    }

    const { data, error } = await supabase
      .from('mission_plans')
      .upsert({
        user_id: user.id,
        mission_id: missionId,
        selected_window_id: selectedWindowId,
        selected_destination_orbit: selectedDestinationOrbit || 'Polar Circular (100km)',
        trajectory_plan: trajectoryPlan || {},
        planned_maneuvers: plannedManeuvers || [],
        user_reserve_delta_v: userReserveDeltaV || 150.0,
      })
      .select()
      .single()

    if (error) {
      return errorResponse(error.message, 'DATABASE_ERROR', 500)
    }

    return jsonResponse({
      success: true,
      data,
    })
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500)
  }
})

