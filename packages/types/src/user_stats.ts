export interface UserStats {
  id: string
  total_points: number
  current_streak: number
  longest_streak: number
  last_active_year_week: string | null
}

export interface PointLedger {
  id: string
  user_id: string
  amount: number
  reason: string
  reference_id: string | null
  created_at: string
}
