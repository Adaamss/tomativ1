import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  className?: string;
}

export default function StarRating({
  rating = 0,
  maxRating = 5,
  size = 'md',
  showValue = false,
  onRatingChange,
  readOnly = false,
  className
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const handleStarClick = (newRating: number) => {
    if (!readOnly && onRatingChange) {
      onRatingChange(newRating);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= Math.floor(rating);
          const isHalfFilled = starValue === Math.ceil(rating) && rating % 1 !== 0;
          
          return (
            <button
              key={index}
              type="button"
              className={cn(
                "relative transition-colors duration-200",
                !readOnly && onRatingChange && "cursor-pointer hover:scale-110",
                readOnly && "cursor-default"
              )}
              onClick={() => handleStarClick(starValue)}
              disabled={readOnly}
              data-testid={`star-${starValue}`}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  "transition-colors duration-200",
                  isFilled ? "fill-yellow-400 text-yellow-400" : 
                  isHalfFilled ? "fill-yellow-400/50 text-yellow-400" :
                  "fill-gray-200 text-gray-200",
                  !readOnly && onRatingChange && "hover:text-yellow-400 hover:fill-yellow-400"
                )}
              />
            </button>
          );
        })}
      </div>
      
      {showValue && (
        <span className={cn(
          "font-medium text-gray-700 ml-2",
          textSizeClasses[size]
        )}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}