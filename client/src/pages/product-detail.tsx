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
      <div className="px-4 py-4 pt-36">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>

      <main className="bg-white">
        {/* Image principale */}
        <div className="aspect-square w-full bg-gray-100 overflow-hidden">
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

        {/* Contenu principal */}
        <div className="px-4 py-4">
          {/* Titre avec cœur vert */}
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-lg font-bold text-gray-900 flex-1 pr-2">
              {listing.title}
            </h1>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              disabled={isToggling}
              className={`mt-1 ${isLiked ? "text-green-500" : "text-gray-400"}`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? "fill-current" : ""}`} />
            </button>
          </div>
          
          {/* Catégorie et date */}
          <p className="text-sm text-gray-500 mb-3">
            Véhicules • publié {formatTimeAgo(listing.createdAt)}
          </p>

          {/* Prix */}
          <div className="mb-4">
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(listing.price)}
            </p>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="mb-4">
              <p className="text-gray-700 text-sm leading-5">
                {listing.description}
              </p>
            </div>
          )}

          {/* Condition */}
          {listing.condition && (
            <div className="mb-4">
              <p className="text-sm text-gray-900">
                <span className="font-medium">Condition</span> <span className="capitalize">{listing.condition}</span>
              </p>
            </div>
          )}

          {/* Where to meet */}
          <div className="mb-4">
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-gray-900">Où se rencontrer</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Statistiques */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              {listing.views || 4} chats • {listing.likes || 1} favoris • 75 vues
            </p>
          </div>

          {/* Bouton orange principal */}
          {isAuthenticated && user?.id !== listing.userId && (
            <div className="mb-6">
              <Button
                onClick={() =>
                  setChatModal({
                    isOpen: true,
                    listing,
                    sellerId: listing.userId,
                  })
                }
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-base font-medium rounded-lg"
              >
                Contacter le vendeur sur Tomati
              </Button>
            </div>
          )}

          {/* Profil vendeur */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold text-gray-900">
                  {user?.id === listing.userId ? "Moi" : "Frankie"}
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-400 rounded flex items-center justify-center">
                    <span className="text-xs text-white font-bold">★</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">567</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Tunis</p>
              <p className="text-xs text-gray-400">32 avis</p>
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
