import { handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { getAuthenticatedUser, getServiceClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const userResult = await getAuthenticatedUser(req)
    if (!userResult || !userResult.data.user) {
      return errorResponse('Unauthorized: Invalid or missing authentication session', 'UNAUTHORIZED', 401)
    }

    const user = userResult.data.user
    const supabase = getServiceClient()

    let body = { commanderName: 'Alex Mercer' }
    try {
      body = await req.json()
    } catch (_) {
      // default body
    }

    // Call stored procedure to bootstrap tables safely
    const { data, error } = await supabase.rpc('bootstrap_player_profile', {
      p_user_id: user.id,
      p_commander_name: body.commanderName || 'Alex Mercer',
    })

    if (error) {
      return errorResponse(error.message, 'BOOTSTRAP_FAILED', 500)
    }

    // Fetch full profile and campaign state
    const [profileRes, progressRes, missionsRes] = await Promise.all([
      supabase.from('player_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('campaign_progress').select('*').eq('user_id', user.id).single(),
      supabase.from('campaign_missions').select('*').eq('user_id', user.id),
    ])

    return jsonResponse({
      success: true,
      data: {
        user_id: user.id,
        profile: profileRes.data,
        campaign_progress: progressRes.data,
        campaign_missions: missionsRes.data || [],
      },
    })
  } catch (err: any) {
    return errorResponse(err.message || 'Internal Server Error', 'SERVER_ERROR', 500)
  }
})

