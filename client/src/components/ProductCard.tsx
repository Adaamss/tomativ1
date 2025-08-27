import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Heart, Share2, MapPin, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Listing } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface ProductCardProps {
  listing: Listing;
  onClick?: () => void;
  onContactSeller?: (listing: Listing) => void;
}

export default function ProductCard({ listing, onClick, onContactSeller }: ProductCardProps) {
  const { user, isAuthenticated } = useAuth();
  const formatPrice = (price: string | null) => {
    if (!price || Number(price) === 0) return "Gratuit";
    return `${Number(price).toLocaleString()} TND`;
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
      className="cursor-pointer overflow-hidden hover:shadow-md transition-shadow" 
      onClick={onClick}
      data-testid={`card-product-${listing.id}`}
    >
      <div className="aspect-video bg-secondary flex items-center justify-center relative">
        {mainImage ? (
          <img 
            src={mainImage} 
            alt={listing.title}
            className="w-full h-full object-cover"
            data-testid={`img-product-${listing.id}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p className="text-sm">Pas d'image</p>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <h4 className="font-medium text-foreground mb-1 capitalize" data-testid={`text-title-${listing.id}`}>
          {listing.title}
        </h4>
        <p className="text-lg font-semibold text-primary mb-2" data-testid={`text-price-${listing.id}`}>
          {formatPrice(listing.price)}
        </p>
        
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <MapPin className="w-4 h-4 mr-1" />
          <span data-testid={`text-location-${listing.id}`}>
            {listing.location || 'Tunis, Tunisie'}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span data-testid={`text-time-${listing.id}`}>
            {formatTimeAgo(listing.createdAt)}
          </span>
          <div className="flex items-center space-x-3">
            <span className="flex items-center" data-testid={`text-views-${listing.id}`}>
              <Eye className="w-3 h-3 mr-1" />
              {listing.views || 0}
            </span>
            <span className="flex items-center" data-testid={`text-likes-${listing.id}`}>
              <Heart className="w-3 h-3 mr-1" />
              {listing.likes || 0}
            </span>
            <span className="flex items-center" data-testid={`text-shares-${listing.id}`}>
              <Share2 className="w-3 h-3 mr-1" />
              0
            </span>
          </div>
        </div>
        
        {/* Contact Seller Button */}
        {isAuthenticated && (user as any)?.id !== listing.userId && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onContactSeller?.(listing);
              }}
              variant="outline" 
              size="sm" 
              className="w-full bg-primary/5 hover:bg-primary hover:text-white border-primary text-primary"
              data-testid={`button-contact-${listing.id}`}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contacter le vendeur
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
