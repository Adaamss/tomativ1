import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatModal from "@/components/ChatModal";
import { MiniMap } from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useLikes } from "@/hooks/useLikes";
import type { Listing } from "@shared/schema";

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

  const { isLiked, toggleLike, isToggling } = useLikes(listingId || "");

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
                  >
                    <Phone className="w-4 h-4" />
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
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
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
