import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { RefreshCw, Filter } from "lucide-react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ChatModal from "@/components/ChatModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { Listing, Category } from "@shared/schema";

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [viewAllProducts, setViewAllProducts] = useState(false);
  const [chatModal, setChatModal] = useState<{
    isOpen: boolean;
    listing: Listing | null;
    sellerId: string;
  }>({ isOpen: false, listing: null, sellerId: '' });

  const { data: listings = [], isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ['/api/listings'],
    retry: false,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-36 pb-20">
        {/* Products Header */}
        <div className="px-4 py-4 bg-white border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Tous les produits</h2>
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary hover:text-primary" 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
                }}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Actualiser
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground" 
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-filters"
              >
                <Filter className="w-4 h-4 mr-1" />
                Filtres
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="px-4 py-3 bg-gray-50 border-b border-border">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                Voitures
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Immobilier
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Emploi
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Prix croissant
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Prix décroissant
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                Plus récent
              </Button>
            </div>
          </div>
        )}

        {/* Recent Products Section */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">Produits récents</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-foreground" 
              onClick={() => setViewAllProducts(!viewAllProducts)}
              data-testid="button-view-all"
            >
              {viewAllProducts ? "Voir moins" : "Voir tout"}
            </Button>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listingsLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-secondary animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-secondary rounded animate-pulse" />
                    <div className="h-6 bg-secondary rounded animate-pulse w-1/2" />
                    <div className="h-3 bg-secondary rounded animate-pulse w-3/4" />
                  </div>
                </div>
              ))
            ) : listings.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground mb-2">Aucun produit disponible</h3>
                <p className="text-sm text-muted-foreground">Soyez le premier à publier une annonce !</p>
              </div>
            ) : (
              (viewAllProducts ? listings : listings.slice(0, 6)).map((listing) => (
                <ProductCard 
                  key={listing.id} 
                  listing={listing}
                  onClick={() => navigate(`/listing/${listing.id}`)}
                  onContactSeller={isAuthenticated ? (listing) => {
                    setChatModal({
                      isOpen: true,
                      listing,
                      sellerId: listing.userId
                    });
                  } : undefined}
                />
              ))
            )}
          </div>
        </div>

      </main>

      <Footer />
      {isAuthenticated && <BottomNavigation />}

      {/* Chat Modal */}
      {isAuthenticated && (
        <ChatModal
          isOpen={chatModal.isOpen}
          onClose={() => setChatModal({ isOpen: false, listing: null, sellerId: '' })}
          listing={chatModal.listing}
          sellerId={chatModal.sellerId}
        />
      )}

    </div>
  );
}
