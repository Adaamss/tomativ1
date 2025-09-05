import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import {
  Heart,
  Eye,
  MessageCircle,
  Phone,
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatModal from "@/components/ChatModal";
import { MiniMap } from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useLikes } from "@/hooks/useLikes";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Listing, Review, User as UserType } from "@shared/schema";
import StarRating from "@/components/StarRating";
import ReviewCard from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";

// Typage pour user
interface AuthUser {
  id: string;
  displayName?: string;
}

export default function ProductDetail() {
  const [, params] = useRoute("/listing/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth() as {
    user: AuthUser | null;
    isAuthenticated: boolean;
  };
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [chatModal, setChatModal] = useState({
    isOpen: false,
    listing: null as Listing | null,
    sellerId: "",
  });

  const listingId = params?.id;

  const { data: listing, isLoading } = useQuery<Listing>({
    queryKey: ["/api/listings", listingId],
    enabled: !!listingId,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: [`/api/listings/${listingId}/reviews`],
    enabled: !!listingId,
  });

  const { data: sellerRating } = useQuery<{ average: number; count: number }>({
    queryKey: [`/api/sellers/${listing?.userId}/rating`],
    enabled: !!listing?.userId,
  });

  const { isLiked, toggleLike, isToggling } = useLikes(listingId || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const voteReviewMutation = useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: 'helpful' | 'not_helpful' | 'report' }) => {
      return await apiRequest('POST', `/api/reviews/${reviewId}/vote`, { voteType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}/reviews`] });
      toast({
        title: "Vote enregistré",
        description: "Votre vote a été pris en compte.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer votre vote.",
        variant: "destructive",
      });
    }
  });

  const handleVoteReview = (reviewId: string, voteType: 'helpful' | 'not_helpful' | 'report') => {
    voteReviewMutation.mutate({ reviewId, voteType });
  };

  const formatPrice = (price: string | null) =>
    !price || Number(price) === 0
      ? "Gratuit"
      : `${Number(price).toLocaleString()} TND`;
  const formatTimeAgo = (date: Date | null) =>
    !date
      ? "Date inconnue"
      : formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Chargement...
      </div>
    );
  if (!listing)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        Produit introuvable
        <Button onClick={() => setLocation("/")}>Retour</Button>
      </div>
    );

  const images = listing.images || [];
  const mainImage = images[currentImageIndex] || "";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Back button */}
      <div className="px-4 py-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>

      <main className="px-6 py-6 grid md:grid-cols-2 gap-6">
        {/* Section 1: Photo + like / stats fixed */}
        <div className="space-y-4 sticky top-24">
          <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden">
            {mainImage ? (
              <img
                src={mainImage}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Pas d'image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${idx === currentImageIndex ? "border-primary" : "border-transparent"}`}
                >
                  <img
                    src={img}
                    alt={`thumbnail ${idx}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Like / Views / Time */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              disabled={isToggling}
              className={`flex items-center px-4 py-2 rounded-full border ${
                isLiked
                  ? "bg-red-50 text-red-500 border-red-200"
                  : "bg-gray-50 text-gray-600 border-gray-200"
              }`}
            >
              <Heart className="w-5 h-5 mr-2" />
              {listing.likes || 0}
            </button>

            <div className="flex items-center space-x-4">
              <div className="flex items-center px-3 py-1 bg-gray-50 rounded-full">
                <Eye className="w-4 h-4 mr-1 text-gray-500" />
                {listing.views || 0}
              </div>
              <div className="flex items-center px-3 py-1 bg-gray-50 rounded-full">
                <Clock className="w-4 h-4 mr-1 text-gray-500" />
                {formatTimeAgo(listing.createdAt)}
              </div>
            </div>
          </div>

          {/* Seller Info Block */}
          <Card className="border-none shadow-sm bg-white rounded-xl mt-6">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Vendeur</h3>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {user?.id === listing.userId ? "Moi" : "Vendeur"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Membre depuis {formatTimeAgo(listing.createdAt)}
                  </p>
                </div>
              </div>
              {isAuthenticated && user?.id !== listing.userId && (
                <div className="flex gap-3 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    data-testid="button-phone"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </Button>
                  <Button
                    onClick={() =>
                      setChatModal({
                        isOpen: true,
                        listing,
                        sellerId: listing.userId,
                      })
                    }
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md transition-all"
                    size="sm"
                    data-testid="button-chat"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contacter
                  </Button>
                </div>
              )}
              
              {/* Show login prompt for non-authenticated users */}
              {!isAuthenticated && user?.id !== listing.userId && (
                <div className="flex gap-3 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    onClick={() => window.location.href = '/api/login'}
                    data-testid="button-login-phone"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/api/login'}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md transition-all"
                    size="sm"
                    data-testid="button-login-chat"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contacter
                  </Button>
                </div>
              )}
              
              {/* Show message for non-authenticated users */}
              {!isAuthenticated && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 text-center">
                    <span className="font-medium">Connectez-vous</span> pour contacter le vendeur
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Scrollable / Dynamic Details */}
        <div className="space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Product Title & Price */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {listing.title}
            </h1>
            <p className="text-4xl font-bold text-red-500">
              {formatPrice(listing.price)}
            </p>
          </div>

          {/* Product Details */}
          <Card className="border-none shadow-lg">
            <CardContent>
              <h3 className="text-xl font-bold mb-3">Détails</h3>
              <div className="grid grid-cols-2 gap-4">
                {listing.brand && (
                  <div>
                    <span className="text-sm text-gray-500">Marque</span>
                    <p className="font-medium">{listing.brand}</p>
                  </div>
                )}
                {listing.model && (
                  <div>
                    <span className="text-sm text-gray-500">Modèle</span>
                    <p className="font-medium">{listing.model}</p>
                  </div>
                )}
                {listing.year && (
                  <div>
                    <span className="text-sm text-gray-500">Année</span>
                    <p className="font-medium">{listing.year}</p>
                  </div>
                )}
                {listing.mileage && (
                  <div>
                    <span className="text-sm text-gray-500">Kilométrage</span>
                    <p className="font-medium">
                      {Number(listing.mileage).toLocaleString()} km
                    </p>
                  </div>
                )}
                {listing.fuelType && (
                  <div>
                    <span className="text-sm text-gray-500">Carburant</span>
                    <p className="font-medium capitalize">{listing.fuelType}</p>
                  </div>
                )}
                {listing.transmission && (
                  <div>
                    <span className="text-sm text-gray-500">Transmission</span>
                    <p className="font-medium capitalize">
                      {listing.transmission}
                    </p>
                  </div>
                )}
                {listing.condition && (
                  <div>
                    <span className="text-sm text-gray-500">État</span>
                    <p className="font-medium capitalize">
                      {listing.condition}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          {listing.location && (
            <Card className="border-none shadow-lg">
              <CardContent>
                <h3 className="text-xl font-bold mb-3 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-primary" />
                  Localisation
                </h3>
                <div className="space-y-4">
                  <p className="text-gray-700 font-medium">{listing.location}</p>
                  {listing.latitude && listing.longitude && (
                    <MiniMap
                      latitude={parseFloat(listing.latitude)}
                      longitude={parseFloat(listing.longitude)}
                      location={listing.location}
                      className="h-48"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {listing.description && (
            <Card className="border-none shadow-lg">
              <CardContent>
                <h3 className="text-xl font-bold mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {listing.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Reviews Section */}
          <Card className="border-none shadow-lg">
            <CardContent>
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
              {isAuthenticated && user?.id !== listing.userId && (
                <div className="mb-8">
                  <ReviewForm
                    listingId={listing.id}
                    sellerId={listing.userId}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}/reviews`] });
                      queryClient.invalidateQueries({ queryKey: [`/api/sellers/${listing.userId}/rating`] });
                    }}
                  />
                </div>
              )}

              {/* Login prompt for reviews - Only show if user is not authenticated and not the owner */}
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
                      onClick={() => window.location.href = '/api/login'}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                      data-testid="button-login-review"
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
                        data-testid={`review-${review.id}`}
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
