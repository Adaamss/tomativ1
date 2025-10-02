import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThumbsUp, ThumbsDown, Flag, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import StarRating from "./StarRating";
import type { Review, User } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  review: Review & {
    reviewer?: User;
    seller?: User;
  };
  currentUserId?: string;
  onVote?: (reviewId: string, voteType: 'helpful' | 'not_helpful' | 'report') => void;
  userVote?: {
    voteType: string;
  } | null;
  voteCounts?: {
    helpful: number;
    not_helpful: number;
    report: number;
  };
  className?: string;
}

export default function ReviewCard({
  review,
  currentUserId,
  onVote,
  userVote,
  voteCounts = { helpful: 0, not_helpful: 0, report: 0 },
  className
}: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isOwnReview = currentUserId === review.reviewerId;
  const reviewerName = review.isAnonymous
    ? "Utilisateur anonyme"
    : review.reviewer?.firstName
      ? `${review.reviewer.firstName} ${review.reviewer.lastName?.charAt(0)}.`
      : "Utilisateur";

  const reviewerInitials = review.isAnonymous
    ? "A"
    : review.reviewer?.firstName?.charAt(0) || "U";

  const timeAgo = formatDistanceToNow(new Date(review.createdAt!), {
    addSuffix: true,
    locale: fr
  });

  const handleVote = (voteType: 'helpful' | 'not_helpful' | 'report') => {
    if (onVote && currentUserId && !isOwnReview) {
      onVote(review.id, voteType);
    }
  };

  const shouldTruncate = review.comment && review.comment.length > 200;
  const displayComment = shouldTruncate && !isExpanded
    ? review.comment?.substring(0, 200) + "..." // the? addition the file used to be corruppt at this line
    : review.comment;

  return (
    <Card className={cn("w-full", className)} data-testid={`review-card-${review.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={review.reviewer?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                {reviewerInitials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900" data-testid="reviewer-name">
                  {reviewerName}
                </h4>
                {review.isVerified === 1 && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    ✓ Achat vérifié
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 mt-1">
                <StarRating
                  rating={review.rating}
                  size="sm"
                  readOnly
                  data-testid="review-rating"
                />
                <span className="text-sm text-gray-500">
                  {timeAgo}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            data-testid="review-menu"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {review.title && (
          <h5 className="font-medium text-gray-900 mb-2" data-testid="review-title">
            {review.title}
          </h5>
        )}

        {review.comment && (
          <div className="text-gray-700 text-sm leading-relaxed mb-4">
            <p data-testid="review-comment">{displayComment}</p>

            {shouldTruncate && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0 h-auto text-blue-600 font-normal"
                data-testid="expand-review"
              >
                {isExpanded ? "Voir moins" : "Voir plus"}
              </Button>
            )}
          </div>
        )}

        {/* Vote Actions */}
        {currentUserId && !isOwnReview && (
          <div className="flex items-center space-x-4 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Cette évaluation vous a-t-elle été utile ?</span>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('helpful')}
                className={cn(
                  "flex items-center space-x-1 text-sm",
                  userVote?.voteType === 'helpful' && "bg-green-50 text-green-700"
                )}
                data-testid="vote-helpful"
              >
                <ThumbsUp className="h-4 w-4" />
                <span>Oui</span>
                {voteCounts.helpful > 0 && (
                  <span className="text-xs">({voteCounts.helpful})</span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('not_helpful')}
                className={cn(
                  "flex items-center space-x-1 text-sm",
                  userVote?.voteType === 'not_helpful' && "bg-red-50 text-red-700"
                )}
                data-testid="vote-not-helpful"
              >
                <ThumbsDown className="h-4 w-4" />
                <span>Non</span>
                {voteCounts.not_helpful > 0 && (
                  <span className="text-xs">({voteCounts.not_helpful})</span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('report')}
                className={cn(
                  "flex items-center space-x-1 text-sm text-gray-500",
                  userVote?.voteType === 'report' && "bg-orange-50 text-orange-700"
                )}
                data-testid="report-review"
              >
                <Flag className="h-4 w-4" />
                <span>Signaler</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}