export interface BackendApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface PlayerProfileDTO {
  user_id: string
  commander_name: string
  title: string
  level: number
  xp: number
  xp_to_next_level: number
  credits: number
  total_missions: number
  completed_missions: number
  success_rate: number
  total_discoveries: number
  created_at?: string
  updated_at?: string
}

export interface CampaignMissionDTO {
  id?: string
  user_id?: string
  mission_id: string
  status: 'locked' | 'available' | 'in-progress' | 'completed' | 'failed'
  completion_percentage: number
  best_score: number | null
  attempts: number
  completed_at?: string | null
}

export interface CampaignProgressDTO {
  user_id: string
  active_mission_id: string
  campaign_progress: number
  unlocked_mission_ids: string[]
}

export interface SpacecraftDesignDTO {
  id?: string
  user_id?: string
  mission_id: string
  design_name: string
  selected_components: any[]
  launch_vehicle_id: string | null
  calculated_metrics: Record<string, any>
  catalog_version?: string
  created_at?: string
  updated_at?: string
}

export interface MissionPlanDTO {
  id?: string
  user_id?: string
  mission_id: string
  selected_window_id: string
  selected_destination_orbit: string
  trajectory_plan: any
  planned_maneuvers: any[]
  user_reserve_delta_v: number
}

export interface MissionRunDTO {
  id: string
  user_id: string
  mission_id: string
  spacecraft_design_id: string | null
  launch_vehicle_id: string | null
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  event_seed: number
  simulation_version: string
  state_version: number
  current_phase: string
  current_phase_index: number
  simulation_time_seconds: number
  simulation_state: any
  started_at?: string
  completed_at?: string
}

