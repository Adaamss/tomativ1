import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, ThumbsUp, BarChart3, TrendingUp, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import StarRating from "./StarRating";
import ReviewForm from "./ReviewForm";
import ReviewCard from "./ReviewCard";
import type { Listing, Review, User } from "@shared/schema";

interface ReviewsSectionProps {
  listing: Listing;
}

export default function ReviewsSection({ listing }: ReviewsSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "recent" | "positive" | "negative">("all");

  // Récupération des avis pour cette annonce
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<(Review & { reviewer?: User; seller?: User })[]>({
    queryKey: ["/api/listings", listing.id, "reviews"],
    queryFn: async () => {
      const reviewsData: Review[] = await apiRequest("GET", `/api/listings/${listing.id}/reviews`);
      // Pour chaque avis, récupérer les détails du reviewer
      const reviewsWithUsers = await Promise.all(
        reviewsData.map(async (review: Review) => {
          try {
            const reviewer = await apiRequest("GET", `/api/users/${review.reviewerId}`);
            return { ...review, reviewer };
          } catch {
            return review; // Si on ne peut pas récupérer l'utilisateur, on garde l'avis sans détails
          }
        })
      );
      return reviewsWithUsers;
    },
    enabled: !!listing.id,
  });

  // Récupération de la note moyenne du vendeur
  const { data: sellerRating, isLoading: ratingLoading } = useQuery<{ average: number; count: number }>({
    queryKey: ["/api/sellers", listing.userId, "rating"],
    queryFn: async () => {
      const rating: { average: number; count: number } = await apiRequest("GET", `/api/sellers/${listing.userId}/rating`);
      return rating;
    },
    enabled: !!listing.userId,
  });

  // Mutation pour voter sur un avis
  const voteReviewMutation = useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: "helpful" | "not_helpful" | "report" }) => {
      return await apiRequest("POST", `/api/reviews/${reviewId}/vote`, { voteType });
    },
    onSuccess: () => {
      toast({
        title: "Vote enregistré",
        description: "Merci pour votre retour !",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", listing.id, "reviews"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Connexion requise",
          description: "Vous devez être connecté pour voter.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre vote.",
        variant: "destructive",
      });
    },
  });

  const handleVote = (reviewId: string, voteType: "helpful" | "not_helpful" | "report") => {
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour voter.",
        variant: "destructive",
      });
      return;
    }
    voteReviewMutation.mutate({ reviewId, voteType });
  };

  // Calculs de statistiques
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0;
  
  // Distribution des notes
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(review => review.rating === rating).length,
    percentage: totalReviews > 0 ? (reviews.filter(review => review.rating === rating).length / totalReviews) * 100 : 0
  }));

  // Filtrage des avis
  const filteredReviews = reviews.filter(review => {
    switch (filter) {
      case "recent":
        return review.createdAt && new Date(review.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 jours
      case "positive":
        return review.rating >= 4;
      case "negative":
        return review.rating <= 2;
      default:
        return true;
    }
  });

  const isOwner = user && listing.userId === user.id;
  const hasUserReviewed = reviews.some(review => review.reviewerId === user?.id);

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Avis et évaluations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Note moyenne */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
              </div>
              <StarRating rating={averageRating} readOnly showValue={false} size="md" />
              <p className="text-sm text-gray-500 mt-1">
                {totalReviews} avis{totalReviews !== 1 ? '' : ''}
              </p>
            </div>

            {/* Distribution des notes */}
            <div className="space-y-2">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-sm w-3">{rating}</span>
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="text-xs text-gray-500 w-8">{count}</span>
                </div>
              ))}
            </div>

            {/* Note du vendeur */}
            {sellerRating && !ratingLoading && sellerRating.count > 0 && (
              <div className="text-center border-l pl-6">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Note vendeur</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {sellerRating.average.toFixed(1)}
                </div>
                <StarRating rating={sellerRating.average} readOnly size="sm" />
                <p className="text-xs text-gray-500 mt-1">
                  {sellerRating.count} avis au total
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions et filtres */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Bouton pour laisser un avis */}
        {!isOwner && isAuthenticated && !hasUserReviewed && (
          <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto" data-testid="write-review-button">
                <MessageSquare className="w-4 h-4 mr-2" />
                Laisser un avis
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Votre avis sur cette annonce</DialogTitle>
                <DialogDescription>
                  Partagez votre expérience avec {listing.title}
                </DialogDescription>
              </DialogHeader>
              <ReviewForm
                listingId={listing.id}
                sellerId={listing.userId}
                onSuccess={() => setIsReviewModalOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            data-testid="filter-all"
          >
            Tous ({totalReviews})
          </Button>
          <Button
            variant={filter === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("recent")}
            data-testid="filter-recent"
          >
            Récents
          </Button>
          <Button
            variant={filter === "positive" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("positive")}
            data-testid="filter-positive"
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Positifs
          </Button>
          <Button
            variant={filter === "negative" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("negative")}
            data-testid="filter-negative"
          >
            Négatifs
          </Button>
        </div>
      </div>

      {/* Messages d'information */}
      {!isAuthenticated && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-blue-800 text-center">
              <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => window.location.href = "/api/login"}>
                Connectez-vous
              </Button>
              {" "}pour laisser un avis et aider la communauté
            </p>
          </CardContent>
        </Card>
      )}

      {isOwner && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center">
              Vous ne pouvez pas évaluer votre propre annonce
            </p>
          </CardContent>
        </Card>
      )}

      {hasUserReviewed && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-green-800 text-center">
              ✅ Vous avez déjà évalué cette annonce. Merci pour votre contribution !
            </p>
          </CardContent>
        </Card>
      )}

      {/* Liste des avis */}
      {reviewsLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={user?.id}
              onVote={handleVote}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === "all" ? "Aucun avis pour le moment" : "Aucun avis correspondant au filtre"}
              </h3>
              <p className="text-gray-500">
                {filter === "all" 
                  ? "Soyez le premier à laisser un avis sur cette annonce !" 
                  : "Essayez un autre filtre pour voir plus d'avis."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}