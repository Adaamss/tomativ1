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

      <main className="px-4 pb-6 max-w-lg mx-auto">
        {/* Image principale */}
        <div className="mb-4">
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
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
            <div className="flex gap-2 overflow-x-auto mt-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${idx === currentImageIndex ? "border-[#f14247]" : "border-transparent"}`}
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
        </div>

        {/* Titre avec cœur */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 flex-1">
              {listing.title}
            </h1>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              disabled={isToggling}
              className={`p-1 ${isLiked ? "text-green-500" : "text-gray-400"}`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? "fill-current" : ""}`} />
            </button>
          </div>
          
          {/* Info vendeur/catégorie */}
          <p className="text-sm text-gray-500 mb-2">
            Véhicules • publié {formatTimeAgo(listing.createdAt)}
          </p>
        </div>

        {/* Prix */}
        <div className="mb-4">
          <p className="text-3xl font-bold text-gray-900">
            {formatPrice(listing.price)}
          </p>
        </div>

        {/* Description */}
        {listing.description && (
          <div className="mb-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              {listing.description}
            </p>
          </div>
        )}

        {/* État/Condition */}
        {listing.condition && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">État</span>
              <span className="text-sm text-gray-600 capitalize">{listing.condition}</span>
            </div>
          </div>
        )}

        {/* Where to meet */}
        <div className="mb-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between py-3 cursor-pointer">
            <span className="text-sm font-medium text-gray-900">Lieu de rencontre</span>
            <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
          </div>
        </div>

        {/* Statistiques */}
        <div className="mb-6">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{listing.views || 0} chats</span>
            <span>{listing.likes || 0} favoris</span>
            <span>75 vues</span>
          </div>
        </div>

        {/* Bouton de contact principal */}
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
              className="w-full bg-[#f14247] hover:bg-[#d63384] text-white py-3 text-base font-medium rounded-xl"
            >
              Contacter le vendeur
            </Button>
          </div>
        )}

        {/* Profil vendeur en bas */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">
                  {user?.id === listing.userId ? "Moi" : "Frankie"}
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-400 rounded-sm flex items-center justify-center">
                    <span className="text-xs text-white font-bold">⭐</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">567</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Tunis</p>
              <p className="text-xs text-gray-400">32 avis</p>
            </div>
          </div>
        </div>

        {/* Détails produit (optionnel, replié) */}
        {(listing.brand || listing.model || listing.year || listing.mileage || listing.fuelType || listing.transmission) && (
          <div className="border-t border-gray-200 pt-4 mt-6">
            <h3 className="text-lg font-bold mb-3 text-gray-900">Détails du véhicule</h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              {listing.brand && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Marque</span>
                  <span className="font-medium text-gray-900">{listing.brand}</span>
                </div>
              )}
              {listing.model && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Modèle</span>
                  <span className="font-medium text-gray-900">{listing.model}</span>
                </div>
              )}
              {listing.year && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Année</span>
                  <span className="font-medium text-gray-900">{listing.year}</span>
                </div>
              )}
              {listing.mileage && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Kilométrage</span>
                  <span className="font-medium text-gray-900">
                    {Number(listing.mileage).toLocaleString()} km
                  </span>
                </div>
              )}
              {listing.fuelType && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Carburant</span>
                  <span className="font-medium text-gray-900 capitalize">{listing.fuelType}</span>
                </div>
              )}
              {listing.transmission && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Transmission</span>
                  <span className="font-medium text-gray-900 capitalize">{listing.transmission}</span>
                </div>
              )}
            </div>
          </div>
        )}
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
