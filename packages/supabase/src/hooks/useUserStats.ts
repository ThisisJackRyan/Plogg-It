import { useQuery } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserStats } from '@plogg/types'

export function useUserStats(supabase: SupabaseClient, userId?: string | null) {
  return useQuery({
    queryKey: ['user_stats', userId],
    queryFn: async (): Promise<UserStats | null> => {
      if (!userId) return null
      
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', userId)
        .single()
        
      if (error) {
        if (error.code === 'PGRST116') return null // No rows found
        throw new Error(error.message)
      }
      
      return data as UserStats
    },
    enabled: !!userId,
  })
}

export function useLeaderboard(supabase: SupabaseClient, limit = 50) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: async (): Promise<(UserStats & { profiles: { display_name: string, avatar_url: string } })[]> => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*, profiles(display_name, avatar_url)')
        .order('total_points', { ascending: false })
        .limit(limit)
        
      if (error) {
        throw new Error(error.message)
      }
      
      return data as any
    },
  })
}
