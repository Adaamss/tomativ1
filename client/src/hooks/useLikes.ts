import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./useAuth";

export function useLikes(listingId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user liked this listing
  const { data: isLiked = false } = useQuery({
    queryKey: ['/api/listings', listingId, 'like'],
    enabled: !!user,
    select: (data: { liked: boolean }) => data.liked,
  });

  // Toggle like mutation
  const toggleLike = useMutation({
    mutationFn: () => apiRequest(`/api/listings/${listingId}/like`, 'POST'),
    onSuccess: () => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['/api/listings', listingId, 'like'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listings', listingId] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['/api/likes/user', (user as any).id] });
      }
    },
  });

  return {
    isLiked,
    toggleLike: toggleLike.mutate,
    isToggling: toggleLike.isPending,
  };
}

export function useUserLikes(userId: string) {
  return useQuery({
    queryKey: ['/api/likes/user', userId],
    enabled: !!userId,
  });
}