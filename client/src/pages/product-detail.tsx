import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, MapPin, Eye, Heart, Share2, Phone, MessageCircle, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import ChatModal from "@/components/ChatModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import type { Listing } from "@shared/schema";

export default function ProductDetail() {
  const [, params] = useRoute("/listing/:id");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [chatModal, setChatModal] = useState({
    isOpen: false,
    listing: null as Listing | null,
    sellerId: ''
  });

  const listingId = params?.id;

  const { data: listing, isLoading } = useQuery<Listing>({
    queryKey: ['/api/listings', listingId],
    enabled: !!listingId,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

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

  const getCategorySlug = () => {
    if (!listing || !categories || !Array.isArray(categories)) return '';
    const category = categories.find((cat: any) => cat.id === listing.categoryId);
    return category?.slug || '';
  };

  const categorySlug = getCategorySlug();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-20">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-20">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Produit introuvable</h3>
            <p className="text-muted-foreground mb-4">Cette annonce n'existe plus ou a été supprimée</p>
            <Button onClick={() => setLocation('/')}>
              Retour à l'accueil
            </Button>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const images = listing.images || [];
  const hasImages = images.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-20">
        {/* Back Button */}
        <div className="px-4 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-100">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Image Gallery */}
        <div className="relative">
          {hasImages ? (
            <>
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden rounded-t-2xl">
                <img 
                  src={images[currentImageIndex]} 
                  alt={listing.title}
                  className="w-full h-full object-cover"
                  data-testid="product-image"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>
              
              {images.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                        index === currentImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                      data-testid={`thumbnail-${index}`}
                    >
                      <img 
                        src={image} 
                        alt={`${listing.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-video bg-secondary flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Aucune image disponible</p>
              </div>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-6 py-6 bg-white rounded-t-3xl -mt-4 relative z-10 shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 capitalize mb-3 leading-tight" data-testid="product-title">
                {listing.title}
              </h1>
              <p className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-4" data-testid="product-price">
                {formatPrice(listing.price)}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" className="rounded-full border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all" data-testid="button-favorite">
                <Heart className="w-4 h-4 text-gray-600 hover:text-red-500" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all" data-testid="button-share">
                <Share2 className="w-4 h-4 text-gray-600 hover:text-blue-500" />
              </Button>
            </div>
          </div>

          {/* Location and Stats */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-700">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium" data-testid="product-location">{listing.location || 'Tunis, Tunisie'}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center bg-white px-3 py-1 rounded-full">
                  <Eye className="w-3 h-3 mr-1 text-gray-500" />
                  {listing.views || 0}
                </span>
                <span className="flex items-center bg-white px-3 py-1 rounded-full">
                  <Clock className="w-3 h-3 mr-1 text-gray-500" />
                  {formatTimeAgo(listing.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <Card className="mb-6 border-none shadow-lg bg-gradient-to-br from-white to-gray-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <div className="w-1 h-6 bg-gradient-to-b from-orange-400 to-red-500 rounded-full mr-3"></div>
                  Description
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed" data-testid="product-description">
                  {listing.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card className="mb-6 border-none shadow-lg bg-gradient-to-br from-white to-blue-50">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full mr-3"></div>
                Détails
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Car specific fields */}
                {categorySlug === 'voiture' && (
                  <>
                    {listing.brand && (
                      <div>
                        <span className="text-sm text-muted-foreground">Marque</span>
                        <p className="font-medium" data-testid="product-brand">{listing.brand}</p>
                      </div>
                    )}
                    {listing.model && (
                      <div>
                        <span className="text-sm text-muted-foreground">Modèle</span>
                        <p className="font-medium" data-testid="product-model">{listing.model}</p>
                      </div>
                    )}
                    {listing.year && (
                      <div>
                        <span className="text-sm text-muted-foreground">Année</span>
                        <p className="font-medium" data-testid="product-year">{listing.year}</p>
                      </div>
                    )}
                    {listing.mileage && (
                      <div>
                        <span className="text-sm text-muted-foreground">Kilométrage</span>
                        <p className="font-medium" data-testid="product-mileage">{Number(listing.mileage).toLocaleString()} km</p>
                      </div>
                    )}
                    {listing.fuelType && (
                      <div>
                        <span className="text-sm text-muted-foreground">Carburant</span>
                        <p className="font-medium capitalize" data-testid="product-fuel">{listing.fuelType}</p>
                      </div>
                    )}
                    {listing.transmission && (
                      <div>
                        <span className="text-sm text-muted-foreground">Transmission</span>
                        <p className="font-medium capitalize" data-testid="product-transmission">{listing.transmission}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Real estate specific fields */}
                {categorySlug === 'immobilier' && (
                  <>
                    {listing.propertyType && (
                      <div>
                        <span className="text-sm text-muted-foreground">Type de bien</span>
                        <p className="font-medium capitalize" data-testid="product-property-type">{listing.propertyType}</p>
                      </div>
                    )}
                    {listing.surface && (
                      <div>
                        <span className="text-sm text-muted-foreground">Superficie</span>
                        <p className="font-medium" data-testid="product-surface">{listing.surface} m²</p>
                      </div>
                    )}
                    {listing.rooms && (
                      <div>
                        <span className="text-sm text-muted-foreground">Pièces</span>
                        <p className="font-medium" data-testid="product-rooms">{listing.rooms}</p>
                      </div>
                    )}
                    {listing.bedrooms && (
                      <div>
                        <span className="text-sm text-muted-foreground">Chambres</span>
                        <p className="font-medium" data-testid="product-bedrooms">{listing.bedrooms}</p>
                      </div>
                    )}
                    {listing.bathrooms && (
                      <div>
                        <span className="text-sm text-muted-foreground">Salles de bain</span>
                        <p className="font-medium" data-testid="product-bathrooms">{listing.bathrooms}</p>
                      </div>
                    )}
                    {listing.floor && (
                      <div>
                        <span className="text-sm text-muted-foreground">Étage</span>
                        <p className="font-medium" data-testid="product-floor">{listing.floor}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Job specific fields */}
                {categorySlug === 'emploi' && (
                  <>
                    {listing.jobType && (
                      <div>
                        <span className="text-sm text-muted-foreground">Type de contrat</span>
                        <p className="font-medium capitalize" data-testid="product-job-type">{listing.jobType}</p>
                      </div>
                    )}
                    {listing.experience && (
                      <div>
                        <span className="text-sm text-muted-foreground">Expérience requise</span>
                        <p className="font-medium" data-testid="product-experience">{listing.experience}</p>
                      </div>
                    )}
                    {listing.sector && (
                      <div>
                        <span className="text-sm text-muted-foreground">Secteur</span>
                        <p className="font-medium capitalize" data-testid="product-sector">{listing.sector}</p>
                      </div>
                    )}
                    {listing.salary && (
                      <div>
                        <span className="text-sm text-muted-foreground">Salaire</span>
                        <p className="font-medium" data-testid="product-salary">{Number(listing.salary).toLocaleString()} TND</p>
                      </div>
                    )}
                  </>
                )}

                {/* Common condition field for all categories */}
                {listing.condition && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      {categorySlug === 'voiture' ? 'État du véhicule' :
                       categorySlug === 'immobilier' ? 'État du bien' :
                       categorySlug === 'emploi' ? 'Type de poste' :
                       'État'}
                    </span>
                    <p className="font-medium capitalize" data-testid="product-condition">{listing.condition}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seller Info */}
          <Card className="mb-6 border-none shadow-lg bg-gradient-to-br from-white to-green-50">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-teal-500 rounded-full mr-3"></div>
                Vendeur
              </h3>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-gray-900" data-testid="seller-name">Vendeur privé</p>
                  <p className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full inline-block">Membre depuis {formatTimeAgo(listing.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Actions */}
        {isAuthenticated && (
          <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-white to-white/95 backdrop-blur-sm border-t border-gray-100 shadow-2xl">
            <div className="flex gap-4 max-w-md mx-auto">
              <Button 
                variant="outline"
                className="flex-1 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 rounded-full py-3 font-semibold transition-all duration-300"
                data-testid="button-call"
              >
                <Phone className="w-5 h-5 mr-2 text-green-600" />
                Appeler
              </Button>
              <Button 
                onClick={() => setChatModal({
                  isOpen: true,
                  listing,
                  sellerId: listing.userId
                })}
                className="flex-1 bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white font-bold py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-message"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Message
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />

      {/* Chat Modal */}
      <ChatModal
        isOpen={chatModal.isOpen}
        onClose={() => setChatModal({ isOpen: false, listing: null, sellerId: '' })}
        listing={chatModal.listing}
        sellerId={chatModal.sellerId}
      />
    </div>
  );
}