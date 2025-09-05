import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Listing } from "@shared/schema";

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const timeAgo = listing.createdAt 
    ? formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true, locale: fr })
    : 'Date inconnue';

  const displayPrice = listing.price && Number(listing.price) > 0
    ? `${Number(listing.price).toLocaleString()} ${listing.currency || 'TND'}`
    : 'Gratuit';

  return (
    <div 
      className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      data-testid={`listing-card-${listing.id}`}
    >
      <div className="aspect-video bg-secondary flex items-center justify-center">
        {listing.images && listing.images.length > 0 ? (
          <img 
            src={listing.images[0]} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <svg className="w-16 h-16 text-muted-foreground mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" points="9,22 9,12 15,12 15,22" />
            </svg>
            <p className="text-sm text-muted-foreground mt-2">Pas d'image</p>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h4 className="font-bold text-black mb-1" data-testid={`listing-title-${listing.id}`}>
          {listing.title}
        </h4>
        <p className="text-lg font-bold text-primary mb-2" data-testid={`listing-price-${listing.id}`}>
          {displayPrice}
        </p>
        
        <div className="flex items-center text-sm text-black font-bold mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span data-testid={`listing-location-${listing.id}`}>
            {listing.location || 'Localisation non spécifiée'}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span data-testid={`listing-time-${listing.id}`}>{timeAgo}</span>
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {listing.views || 0}
            </span>
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {listing.likes || 0}
            </span>
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
