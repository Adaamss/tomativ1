import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Filter } from "lucide-react";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import type { Listing, Category } from "@shared/schema";

export default function Home() {
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
      
      <main className="pt-20 pb-20">
        {/* Products Header */}
        <div className="px-4 py-4 bg-white border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Tous les produits</h2>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary" data-testid="button-refresh">
                <RefreshCw className="w-4 h-4 mr-1" />
                Actualiser
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-filters">
                <Filter className="w-4 h-4 mr-1" />
                Filtres
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Products Section */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">Produits récents</h3>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="button-view-all">
              Voir tout
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
              listings.map((listing) => (
                <ProductCard key={listing.id} listing={listing} />
              ))
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div className="px-4 py-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Découvrez nos catégories</h3>
          <p className="text-sm text-muted-foreground mb-6">Trouvez exactement ce que vous cherchez dans nos catégories spécialisées</p>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <div 
                key={category.id}
                className="bg-card border border-border rounded-lg p-6 text-center hover:shadow-md transition-shadow cursor-pointer"
                data-testid={`category-${category.slug}`}
              >
                <div className={`w-12 h-12 bg-${category.color}-100 rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  {category.slug === 'voiture' && (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0M15 17a2 2 0 104 0" />
                    </svg>
                  )}
                  {category.slug === 'immobilier' && (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                  {category.slug === 'emploi' && (
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0V6a2 2 0 00-2 2v6.002" />
                    </svg>
                  )}
                  {category.slug === 'autre' && (
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
                <h4 className="font-medium text-foreground">{category.name}</h4>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNavigation />

      {/* Footer */}
      <footer className="bg-white border-t border-border py-4 text-center">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center space-x-6 text-sm text-muted-foreground mb-2">
            <span>Immobilier</span>
            <span>Voitures</span>
            <span>Accueil</span>
            <span>Catégories</span>
            <span>FAQ</span>
            <span>À propos</span>
            <span>Sécurité</span>
            <span>Cookies</span>
            <span>Connexion</span>
            <span>S'inscrire</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center text-sm text-muted-foreground">
            <p>&copy; 2024 Tomati. Tous droits réservés.</p>
            <p className="flex items-center">
              Made with <span className="text-red-500 mx-1">❤️</span> in Tunisia
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
