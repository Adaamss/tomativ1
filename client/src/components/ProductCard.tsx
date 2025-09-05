import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Heart, Share2, MapPin, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import type { Listing } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useLikes } from "@/hooks/useLikes";
import StarRating from "./StarRating";
import OptimizedImage from "./OptimizedImage";

interface ProductCardProps {
  listing: Listing;
  onClick?: () => void;
  onContactSeller?: (listing: Listing) => void;
}

export default function ProductCard({ listing, onClick, onContactSeller }: ProductCardProps) {
  const { user, isAuthenticated } = useAuth();
  const { isLiked, toggleLike, isToggling } = useLikes(listing.id);
  
  // Fetch seller rating
  const { data: sellerRating } = useQuery<{ average: number; count: number }>({
    queryKey: [`/api/sellers/${listing.userId}/rating`],
    enabled: !!listing.userId,
  });
  
  const formatPrice = (price: string | null) => {
    if (!price || Number(price) === 0) return "Gratuit";
    return `${Number(price).toLocaleString()} TND`;
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAuthenticated) {
      toggleLike();
    } else {
      // Redirect to login if not authenticated
      window.location.href = '/login';
    }
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return "Date inconnue";
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true, 
      locale: fr 
    });
  };

  const getMainImage = () => {
    if (listing.images && listing.images.length > 0) {
      return listing.images[0];
    }
    return null;
  };

  const mainImage = getMainImage();

  return (
    <Card 
      className="cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-none shadow-lg bg-white rounded-2xl" 
      onClick={onClick}
      data-testid={`card-product-${listing.id}`}
    >
      <div className="aspect-video relative overflow-hidden">
        {mainImage ? (
          <OptimizedImage
            src={mainImage} 
            alt={listing.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            data-testid={`img-product-${listing.id}`}
            lazy={true}
          />
        ) : (
          <div className="flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 w-full h-full">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#f14247' }}>
              <span className="text-3xl">🍅</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-700 mb-1">Tomati</p>
              <p className="text-sm text-gray-500">Image bientôt disponible</p>
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="p-5">
        <h4 className="font-bold text-gray-900 mb-2 capitalize text-lg leading-tight" data-testid={`text-title-${listing.id}`}>
          {listing.title}
        </h4>
        <p className="text-2xl font-bold mb-3" style={{ color: '#f14247' }} data-testid={`text-price-${listing.id}`}>
          {formatPrice(listing.price)}
        </p>
        
        <div className="flex items-center text-sm text-gray-600 mb-3 bg-gray-50 rounded-full px-3 py-2">
          <MapPin className="w-4 h-4 mr-2 text-blue-500" />
          <span className="font-medium" data-testid={`text-location-${listing.id}`}>
            {listing.location || 'Tunis, Tunisie'}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 bg-white px-3 py-1 rounded-full" data-testid={`text-time-${listing.id}`}>
            {formatTimeAgo(listing.createdAt)}
          </span>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="flex items-center bg-blue-50 text-blue-600 px-2 py-1 rounded-full" data-testid={`text-views-${listing.id}`}>
                <Eye className="w-3 h-3 mr-1" />
                {listing.views || 0}
              </span>
              <span className="flex items-center px-2 py-1 rounded-full" style={{ backgroundColor: '#f1424720', color: '#f14247' }} data-testid={`text-likes-${listing.id}`}>
                <Heart className="w-3 h-3 mr-1" />
                {listing.likes || 0}
              </span>
            </div>
            
            {/* Display seller rating if available */}
            {sellerRating && sellerRating.count > 0 && (
              <div className="flex items-center space-x-1" data-testid={`rating-seller-${listing.id}`}>
                <StarRating 
                  rating={sellerRating.average} 
                  size="sm" 
                  readOnly 
                />
                <span className="text-xs text-gray-600">
                  ({sellerRating.count})
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-4 flex items-center space-x-2">
          {/* Like Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className={`transition-colors duration-200 ${
              isAuthenticated && isLiked 
                ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
            }`}
            onClick={handleLikeClick}
            disabled={isToggling}
            data-testid={`button-like-${listing.id}`}
          >
            <Heart className={`w-4 h-4 ${isAuthenticated && isLiked ? 'fill-current' : ''}`} />
            {!isAuthenticated && <span className="ml-1 text-xs">Se connecter</span>}
          </Button>

          {/* Contact Seller Button */}
          {isAuthenticated && (user as any)?.id !== listing.userId && (
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onContactSeller?.(listing);
              }}
              style={{ backgroundColor: '#f14247' }}
              className="flex-1 hover:opacity-90 text-white font-semibold py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              data-testid={`button-contact-${listing.id}`}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contacter le vendeur
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
