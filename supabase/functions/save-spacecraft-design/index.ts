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
    const { missionId, designName, selectedComponents, launchVehicleId, calculatedMetrics } = await req.json()

    if (!missionId || !selectedComponents) {
      return errorResponse('Missing required spacecraft design payload', 'VALIDATION_ERROR', 400)
    }

    // Save design
    const { data, error } = await supabase
      .from('spacecraft_designs')
      .insert({
        user_id: user.id,
        mission_id: missionId,
        design_name: designName || 'Custom Flight Configuration',
        selected_components: selectedComponents,
        launch_vehicle_id: launchVehicleId || null,
        calculated_metrics: calculatedMetrics || {},
        catalog_version: 'v1.0.0',
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

