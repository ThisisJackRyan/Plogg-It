'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSupabaseBrowser } from '@/lib/supabase/browser';

export function PointsToastProvider() {
  const { userId } = useAuth();
  const supabase = useSupabaseBrowser();
  
  useEffect(() => {
    if (!userId) return;
    
    let isMounted = true;
    
    // Subscribe to new rows in the point_ledger table for this user
    const channel = supabase
      .channel('public:point_ledger')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_ledger',
          filter: `user_id=eq.${userId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (!isMounted) return;
          const { id, amount, reason, reference_id: referenceId } = payload.new;
          
          let title = 'Points earned!';
          let description = `You earned ${amount} points.`;
          
          if (reason === 'hotspot_reported') {
            title = 'Hotspot Reported! 🎉';
            description = `You earned ${amount} points for reporting a trash hotspot.`;
          } else if (reason === 'hotspot_cleaned') {
            title = 'Cleanup Complete! 🏆';
            description = `You earned ${amount} points for making the world cleaner.`;
          } else if (reason === 'route_completed') {
            title = 'Route Completed! 🏃';
            description = `You earned ${amount} points for tracking your route.`;
          }
          
          const toastId =
            reason === 'hotspot_reported' && referenceId
              ? `hotspot-reported-${referenceId}`
              : id
                ? `point-ledger-${id}`
                : undefined;

          toast.success(title, {
            id: toastId,
            description,
          });
        }
      )
      .subscribe();
      
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return null;
}