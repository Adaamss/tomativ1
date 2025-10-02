import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Navigation, Plus, MapPin, Package } from "lucide-react";
import L from "leaflet";
import type { Listing } from "@shared/schema";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icon for different categories
const createCustomMarker = (categoryId: string) => {
  const iconColor = getCategoryColor(categoryId);
  return L.divIcon({
    html: `<div class="custom-marker" style="background-color: ${iconColor}">
             <span class="marker-icon">${getCategoryIcon(categoryId)}</span>
           </div>`,
    className: "custom-div-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const getCategoryColor = (categoryId: string) => {
  const colors: { [key: string]: string } = {
    voitures: "#ef4444", // red
    immobilier: "#3b82f6", // blue
    emplois: "#10b981", // green
    default: "#6366f1", // indigo
  };

  for (const [key, color] of Object.entries(colors)) {
    if (categoryId.toLowerCase().includes(key)) {
      return color;
    }
  }
  return colors.default;
};

const getCategoryIcon = (categoryId: string) => {
  if (categoryId.toLowerCase().includes("voiture")) return "🚗";
  if (categoryId.toLowerCase().includes("immobilier")) return "🏠";
  if (categoryId.toLowerCase().includes("emploi")) return "💼";
  return "📦";
};

// Component to handle map controls
function MapControls() {
  const map = useMap();

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();
  const centerOnTunis = () => map.setView([36.8065, 10.1815], 11);

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
      <Button
        size="icon"
        variant="outline"
        className="w-10 h-10 bg-white shadow-lg hover:bg-gray-50"
        onClick={zoomIn}
        data-testid="button-zoom-in"
      >
        <span className="text-lg font-bold">+</span>
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="w-10 h-10 bg-white shadow-lg hover:bg-gray-50"
        onClick={zoomOut}
        data-testid="button-zoom-out"
      >
        <span className="text-lg font-bold">−</span>
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="w-10 h-10 bg-white shadow-lg hover:bg-gray-50"
        onClick={centerOnTunis}
        data-testid="button-center"
      >
        <Navigation className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Component for location info panel
function LocationPanel({ listingsCount }: { listingsCount: number }) {
  return (
    <div className="absolute bottom-4 left-4 right-16 z-[1000]">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="font-medium text-foreground mb-2 flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-primary" />
          Tunis, Tunisie
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Explorez les annonces autour de vous
        </p>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span>{listingsCount} annonces disponibles</span>
        </div>
      </div>
    </div>
  );
}

// Component for add listing button
function AddListingButton() {
  const handleAddListing = () => {
    window.location.href = "/create-listing";
  };

  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      <Button
        size="lg"
        className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
        onClick={handleAddListing}
        data-testid="button-add-listing"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}

export default function Map() {
  const [listingsWithCoords, setListingsWithCoords] = useState<Listing[]>([]);

  // ✅ Updated: Expect object with listings + pagination
  const { data, isLoading } = useQuery<{ listings: Listing[]; pagination: any }>({
    queryKey: ["/api/listings"],
    refetchInterval: 30000,
  });

  const listings = data?.listings ?? [];

  // Debug logs
  useEffect(() => {
    console.log("📦 Raw data from API:", data);
    console.log("📦 Extracted listings:", listings);
  }, [data]);

  // Filter listings that have coordinates
  useEffect(() => {
    if (Array.isArray(listings)) {
      const withCoords = listings.filter(
        (listing) =>
          listing.latitude &&
          listing.longitude &&
          parseFloat(listing.latitude) !== 0 &&
          parseFloat(listing.longitude) !== 0
      );
      setListingsWithCoords(withCoords);
    } else {
      console.warn("⚠️ Listings is not an array, skipping filter. Value:", listings);
      setListingsWithCoords([]);
    }
  }, [listings]);

  const formatPrice = (price: string | null, currency: string | null) => {
    if (!price) return "Prix non spécifié";
    const numPrice = parseFloat(price);
    return `${numPrice.toLocaleString("fr-TN")} ${currency || "TND"}`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 pb-20">
        <div className="h-[calc(100vh-160px)] relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full bg-blue-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  Chargement de la carte...
                </p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={[36.8065, 10.1815]} // Tunis coordinates
              zoom={11}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {listingsWithCoords.map((listing) => (
                <Marker
                  key={listing.id}
                  position={[
                    parseFloat(listing.latitude!),
                    parseFloat(listing.longitude!),
                  ]}
                  icon={createCustomMarker(listing.categoryId ?? "")}
                >
                  <Popup className="custom-popup" maxWidth={280}>
                    <div className="p-1">
                      <div className="flex items-start space-x-3">
                        {listing.images && listing.images.length > 0 ? (
                          <img
                            src={
                              listing.images[0].startsWith("http")
                                ? listing.images[0]
                                : `/objects/${listing.images[0]}`
                            }
                            alt={listing.title ?? undefined}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect width="18" height="18" x="3" y="3" rx="2" ry="2"/%3E%3Ccircle cx="9" cy="9" r="2"/%3E%3Cpath d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/%3E%3C/svg%3E';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm leading-tight mb-1">
                            {truncateText(listing.title ?? "", 45)}
                          </h4>

                          <div className="text-xs text-muted-foreground mb-2">
                            📍 {listing.location || "Localisation non spécifiée"}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-primary">
                              {formatPrice(listing.price, listing.currency)}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryIcon(listing.categoryId ?? "")}
                            </Badge>
                          </div>

                          <Button
                            size="sm"
                            className="w-full mt-2 text-xs h-7"
                            onClick={() =>
                              (window.location.href = `/listing/${listing.id}`)
                            }
                          >
                            Voir détails
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              <MapControls />
            </MapContainer>
          )}

          <LocationPanel listingsCount={listingsWithCoords.length} />
          <AddListingButton />
        </div>
      </main>

      <BottomNavigation />

      {/* Add custom CSS for markers */}
      <style>{`
        .custom-marker {
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .marker-icon {
          transform: rotate(45deg);
          font-size: 12px;
        }

        .custom-div-icon {
          background: none !important;
          border: none !important;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
        }

        .leaflet-popup-tip {
          background: white;
        }
      `}</style>
    </div>
  );
}
