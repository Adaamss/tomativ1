import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Heart, Eye, Clock, Phone, MessageCircle, 
  MapPin, User, Star, Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { normalizeImageUrl } from "@/lib/imageUtils";
import type { Listing, Review } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReviewForm from "@/components/ReviewForm";
import ReviewCard from "@/components/ReviewCard";
import StarRating from "@/components/StarRating";
import ChatModal from "@/components/ChatModal";
import PriceNegotiation from "@/components/PriceNegotiation";
import AppointmentManager from "@/components/AppointmentManager";
import ReviewsSection from "@/components/ReviewsSection";

export default function ProductDetail() {
  const params = useParams();
  const listingId = params.id;
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isToggling, setIsToggling] = useState(false);
  const [chatModal, setChatModal] = useState<{
    isOpen: boolean;
    listing: Listing | null;
    sellerId: string;
  }>({ isOpen: false, listing: null, sellerId: '' });

  const { data: listing, isLoading } = useQuery<Listing>({
    queryKey: [`/api/listings/${listingId}`],
    retry: false,
  });

  const { data: sellerRating } = useQuery<{ average: number; count: number }>({
    queryKey: [`/api/sellers/${listing?.userId}/rating`],
    enabled: !!listing?.userId,
    retry: false,
  });

  const { data: likeData } = useQuery<{ liked: boolean; count: number }>({
    queryKey: [`/api/listings/${listingId}/like`],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: [`/api/listings/${listingId}/reviews`],
    retry: false,
  });

  const isLiked = likeData?.liked || false;

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      const method = isLiked ? "DELETE" : "POST";
      return await apiRequest(method, `/api/listings/${listingId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}/like`] });
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}`] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Connexion requise",
          description: "Vous devez être connecté pour aimer une annonce",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/login"), 500);
        return;
      }
    },
  });

  const toggleLike = () => {
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour aimer une annonce",
      });
      return;
    }
    setIsToggling(true);
    toggleLikeMutation.mutate();
    setTimeout(() => setIsToggling(false), 500);
  };

  const voteReviewMutation = useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: 'helpful' | 'not_helpful' | 'report' }) => {
      return await apiRequest("POST", `/api/reviews/${reviewId}/vote`, { voteType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}/reviews`] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Connexion requise",
          description: "Vous devez être connecté pour voter",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible de voter. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const handleVoteReview = (reviewId: string, voteType: 'helpful' | 'not_helpful' | 'report') => {
    voteReviewMutation.mutate({ reviewId, voteType });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'annonce...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Annonce non trouvée</h1>
          <p className="text-gray-600 mb-4">Cette annonce n'existe pas ou a été supprimée.</p>
          <Button onClick={() => setLocation("/")}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const normalizedImages = listing.images && listing.images.length > 0 
    ? listing.images.map(url => normalizeImageUrl(url)).filter(Boolean)
    : [];
  const mainImage = normalizedImages[currentImageIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Back button */}
      <div className="px-6 py-4 bg-white border-b">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 min-h-[calc(100vh-200px)]">
        {/* Fixed layout with image column fixed and content column scrollable */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 space-y-6 lg:space-y-0">
          
          {/* Left Column: Fixed - Image and Seller Info */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
            {/* Main Image */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-square bg-gray-100 relative rounded-lg overflow-hidden">
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={listing.title || "Produit"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/api/placeholder/400/400";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-xl font-medium">Pas d'image</p>
                      <p className="text-sm">Image non disponible pour ce produit</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Thumbnail Images */}
            {normalizedImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto">
                {normalizedImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex ? "border-primary shadow-lg" : "border-gray-200"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Vue ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/api/placeholder/80/80";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Stats directly under image */}
            <div className="flex items-center space-x-4 text-sm text-gray-500 py-2">
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                <span>{listing.views || 41} vues</span>
              </div>
              <div className="flex items-center">
                <Heart className="w-4 h-4 mr-1" />
                <span>{listing.likes || 0} favoris</span>
              </div>
            </div>

            {/* Seller Information - Under Image */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base text-gray-900">
                      {user?.id === listing.userId ? "Vous" : "Vendeur"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Membre depuis quelque temps
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                {isAuthenticated && user && user.id !== listing.userId && (
                  <div className="space-y-2">
                    <Button
                      onClick={() =>
                        setChatModal({
                          isOpen: true,
                          listing,
                          sellerId: listing.userId || "",
                        })
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm font-medium rounded-lg"
                    >
                      Message
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-300 hover:border-gray-400 py-3 text-sm font-medium rounded-lg"
                    >
                      Appeler
                    </Button>
                  </div>
                )}

                {/* Login prompt for non-authenticated users */}
                {!isAuthenticated && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => window.location.href = '/login'}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm font-medium rounded-lg"
                    >
                      Message
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-300 py-3 text-sm font-medium rounded-lg"
                      onClick={() => window.location.href = '/login'}
                    >
                      Appeler
                    </Button>
                    <div className="p-4 bg-gray-50 rounded-lg mt-3">
                      <p className="text-sm text-gray-600 text-center">
                        Connectez-vous pour contacter le vendeur
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Product Information */}
          <div className="space-y-6 pb-6 lg:pt-8">
            {/* Spacing at top */}
            <div className="hidden lg:block h-8"></div>
            
            {/* Product Title and Price */}
            <div>
              {listing.title && (
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                  {listing.title}
                </h1>
              )}
              {!listing.title && (
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
                  Volkswagen Golf VII
                </h1>
              )}
              <p className="text-3xl font-bold text-green-600 mb-4">
                {listing.price ? `${Number(listing.price).toLocaleString()} TND` : "Prix non spécifié"}
              </p>
              <div className="text-sm text-gray-500 mb-6">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md mr-2">Furniture</span>
                <span>publié il y a quelques heures</span>
              </div>
            </div>

            {/* Edit Button - Only for owners */}
            {user && listing.userId === user.id && (
              <Button
                onClick={() => setLocation(`/edit-listing/${listingId}`)}
                className="w-full mb-4"
                variant="outline"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modifier cette annonce
              </Button>
            )}

            {/* Price Negotiation Component */}
            <PriceNegotiation listing={listing} />

            {/* Appointment Manager Component */}
            <AppointmentManager listing={listing} />

            {/* Like Button */}
            <button
              onClick={toggleLike}
              disabled={isToggling}
              className={`w-full flex items-center justify-center py-3 px-6 rounded-lg font-medium transition-all ${
                isLiked
                  ? "bg-red-50 text-red-600 border-2 border-red-200"
                  : "bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <Heart className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? 'Retiré des favoris' : 'Ajouter aux favoris'} ({listing.likes || 0})
            </button>

            {/* Product Description */}
            {listing.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Product Details */}
            {(listing.brand || listing.model || listing.year || listing.mileage || listing.fuelType || listing.transmission || listing.condition) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Détails</h3>
                <div className="space-y-3">
                  {listing.brand && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">Créateur:</span>
                      <span className="text-gray-700">{listing.brand}</span>
                    </div>
                  )}
                  {listing.model && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">Modèle:</span>
                      <span className="text-gray-700">{listing.model}</span>
                    </div>
                  )}
                  {listing.year && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">Année:</span>
                      <span className="text-gray-700">{listing.year}</span>
                    </div>
                  )}
                  {listing.condition && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">État:</span>
                      <span className="text-gray-700 capitalize">{listing.condition}</span>
                    </div>
                  )}
                  {listing.mileage && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">Kilométrage:</span>
                      <span className="text-gray-700">{Number(listing.mileage).toLocaleString()} km</span>
                    </div>
                  )}
                  {listing.fuelType && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">Carburant:</span>
                      <span className="text-gray-700 capitalize">{listing.fuelType}</span>
                    </div>
                  )}
                  {listing.transmission && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">Transmission:</span>
                      <span className="text-gray-700 capitalize">{listing.transmission}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {listing.location && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Localisation</h3>
                <p className="text-blue-600 font-medium">
                  Retrait près de {listing.location}
                </p>
              </div>
            )}

            {/* Reviews Section */}
            <div className="mt-12">
              <ReviewsSection listing={listing} />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <ChatModal
        isOpen={chatModal.isOpen}
        onClose={() =>
          setChatModal({ isOpen: false, listing: null, sellerId: "" })
        }
        listing={chatModal.listing}
        sellerId={chatModal.sellerId}
      />
    </div>
  );
}
