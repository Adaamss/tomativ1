import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Heart, Eye, Clock, Phone, MessageCircle, 
  MapPin, User, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Listing, Review } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReviewForm from "@/components/ReviewForm";
import ReviewCard from "@/components/ReviewCard";
import StarRating from "@/components/StarRating";
import ChatModal from "@/components/ChatModal";

export default function ProductDetail({ listingId }: { listingId: string }) {
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

  const images = listing.images && listing.images.length > 0 ? listing.images : [];
  const mainImage = images[currentImageIndex];

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

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Mobile-first responsive layout */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          
          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Image Gallery */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-100 relative">
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={listing.title || "Produit"}
                      className="w-full h-full object-cover"
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
                
                {images.length > 1 && (
                  <div className="p-4">
                    <div className="flex gap-3 overflow-x-auto">
                      {images.map((img, idx) => (
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
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Info */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      {listing.title || "Titre non spécifié"}
                    </h1>
                    <p className="text-3xl lg:text-4xl font-bold text-red-500">
                      {listing.price ? `${Number(listing.price).toLocaleString()} TND` : "Prix non spécifié"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <div className="flex items-center px-3 py-1 bg-gray-100 rounded-full">
                      <Eye className="w-4 h-4 mr-1 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">{listing.views || 0}</span>
                    </div>
                    <div className="flex items-center px-3 py-1 bg-gray-100 rounded-full">
                      <Clock className="w-4 h-4 mr-1 text-gray-500" />
                      <span className="text-sm font-medium text-gray-600">Il y a quelques heures</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Details */}
            {(listing.brand || listing.model || listing.year || listing.mileage || listing.fuelType || listing.transmission || listing.condition) && (
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Caractéristiques
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listing.brand && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="text-sm text-gray-500 block mb-1 font-medium">Marque</span>
                        <p className="font-bold text-gray-900">{listing.brand}</p>
                      </div>
                    )}
                    {listing.model && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="text-sm text-gray-500 block mb-1 font-medium">Modèle</span>
                        <p className="font-bold text-gray-900">{listing.model}</p>
                      </div>
                    )}
                    {listing.year && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="text-sm text-gray-500 block mb-1 font-medium">Année</span>
                        <p className="font-bold text-gray-900">{listing.year}</p>
                      </div>
                    )}
                    {listing.mileage && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="text-sm text-gray-500 block mb-1 font-medium">Kilométrage</span>
                        <p className="font-bold text-gray-900">
                          {Number(listing.mileage).toLocaleString()} km
                        </p>
                      </div>
                    )}
                    {listing.fuelType && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="text-sm text-gray-500 block mb-1 font-medium">Carburant</span>
                        <p className="font-bold text-gray-900 capitalize">{listing.fuelType}</p>
                      </div>
                    )}
                    {listing.transmission && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="text-sm text-gray-500 block mb-1 font-medium">Transmission</span>
                        <p className="font-bold text-gray-900 capitalize">{listing.transmission}</p>
                      </div>
                    )}
                    {listing.condition && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="text-sm text-gray-500 block mb-1 font-medium">État</span>
                        <p className="font-bold text-gray-900 capitalize">{listing.condition}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            {listing.location && (
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    Localisation
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 font-semibold">{listing.location}</p>
                    </div>
                    {listing.latitude && listing.longitude && (
                      <div className="h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <MapPin className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Carte non disponible</p>
                          <p className="text-xs">Position: {listing.latitude}, {listing.longitude}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {listing.description && (
              <Card className="border-none shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                    </svg>
                    Description
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {listing.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:col-span-1 space-y-6 mt-6 lg:mt-0">
            
            {/* Like Button */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <button
                  onClick={toggleLike}
                  disabled={isToggling}
                  className={`w-full flex items-center justify-center px-4 py-3 rounded-xl font-semibold transition-all ${
                    isLiked
                      ? "bg-red-50 text-red-600 border-2 border-red-200"
                      : "bg-gray-50 text-gray-600 border-2 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Heart className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                  {isLiked ? 'Retiré des favoris' : 'Ajouter aux favoris'} ({listing.likes || 0})
                </button>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-primary" />
                  Vendeur
                </h3>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-red-600 flex items-center justify-center shadow-lg">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg text-gray-900">
                      {user?.id === listing.userId ? "Vous" : "Vendeur"}
                    </p>
                    <p className="text-sm text-gray-500 mb-2">
                      Membre depuis quelque temps
                    </p>
                    {sellerRating && sellerRating.count > 0 && (
                      <div className="flex items-center">
                        <StarRating 
                          rating={sellerRating.average} 
                          size="sm" 
                          showValue 
                          readOnly 
                        />
                        <span className="text-sm text-gray-600 ml-2">
                          ({sellerRating.count} avis)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Buttons - Only show if user is authenticated and not the owner */}
                {isAuthenticated && user && user.id !== listing.userId && (
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1 border-gray-300 hover:border-gray-400"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Appeler
                    </Button>
                    <Button
                      onClick={() =>
                        setChatModal({
                          isOpen: true,
                          listing,
                          sellerId: listing.userId || "",
                        })
                      }
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                      size="sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contacter
                    </Button>
                  </div>
                )}

                {/* Login prompt for non-authenticated users */}
                {!isAuthenticated && (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => window.location.href = '/login'}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Appeler
                      </Button>
                      <Button
                        onClick={() => window.location.href = '/login'}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                        size="sm"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contacter
                      </Button>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 text-center">
                        <span className="font-medium">Connectez-vous</span> pour contacter le vendeur
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-400" />
                    Avis clients
                  </h3>
                  {sellerRating && sellerRating.count > 0 && (
                    <div className="flex items-center space-x-2">
                      <StarRating 
                        rating={sellerRating.average} 
                        size="sm" 
                        showValue 
                        readOnly 
                      />
                      <span className="text-sm text-gray-600">
                        ({sellerRating.count} avis)
                      </span>
                    </div>
                  )}
                </div>

                {/* Review Form - Only show if user is authenticated and not the owner */}
                {isAuthenticated && user && user.id !== listing.userId && (
                  <div className="mb-8">
                    <ReviewForm
                      listingId={listing.id}
                      sellerId={listing.userId || ""}
                      onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}/reviews`] });
                        queryClient.invalidateQueries({ queryKey: [`/api/sellers/${listing.userId}/rating`] });
                      }}
                    />
                  </div>
                )}

                {/* Login prompt for reviews */}
                {!isAuthenticated && (
                  <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <Star className="w-8 h-8 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-blue-900 mb-2">
                        Donnez votre avis !
                      </h4>
                      <p className="text-blue-700 mb-4">
                        Connectez-vous pour partager votre expérience avec ce vendeur
                      </p>
                      <Button
                        onClick={() => window.location.href = '/login'}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                      >
                        Se connecter pour évaluer
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reviews List */}
                <div className="space-y-6">
                  {reviewsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-gray-600 mt-2">Chargement des avis...</p>
                    </div>
                  ) : reviews.length > 0 ? (
                    <>
                      <div className="text-sm text-gray-600 mb-4">
                        {reviews.length} avis pour ce vendeur
                      </div>
                      {reviews.map((review) => (
                        <ReviewCard
                          key={review.id}
                          review={review}
                          currentUserId={user?.id}
                          onVote={handleVoteReview}
                          className="mb-4"
                        />
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Aucun avis pour le moment
                        </h4>
                        <p className="text-gray-600">
                          Soyez le premier à donner votre avis sur ce vendeur !
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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