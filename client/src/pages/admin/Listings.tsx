import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Package, Eye, Star, MapPin } from "lucide-react";
import AdminNavigation from "@/components/AdminNavigation";

export default function AdminListings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/';
    }
  }, [user, authLoading]);

  const { data: listings, isLoading } = useQuery({
    queryKey: ['/api/admin/listings'],
    enabled: !!user && user.role === 'admin',
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ listingId, isActive }: { listingId: string; isActive: number }) => {
      await apiRequest(`/api/admin/listings/${listingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/listings'] });
      toast({
        title: "Succès",
        description: "Statut de l'annonce mis à jour avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour du statut",
        variant: "destructive",
      });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleToggleStatus = (listingId: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    toggleStatusMutation.mutate({ listingId, isActive: newStatus });
  };

  const getStatusBadge = (isActive: number, isAd: number) => {
    if (isAd === 1) {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        <Star className="h-3 w-3 mr-1" />
        Publicité
      </Badge>;
    }
    return isActive === 1 ? 
      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Actif</Badge> : 
      <Badge variant="secondary">Inactif</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminNavigation />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Package className="h-8 w-8" />
          Gestion des Annonces
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gérer le statut et la visibilité des annonces
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Annonces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {listings && listings.length > 0 ? (
              listings.map((listing: any) => (
                <div 
                  key={listing.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`listing-row-${listing.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {listing.images && listing.images.length > 0 ? (
                        <img 
                          src={listing.images[0]} 
                          alt={listing.title}
                          className="h-16 w-16 rounded-lg object-cover"
                          data-testid={`img-listing-${listing.id}`}
                        />
                      ) : (
                        <div 
                          className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                          data-testid={`placeholder-listing-${listing.id}`}
                        >
                          <Package className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium" data-testid={`text-title-${listing.id}`}>
                          {listing.title}
                        </h3>
                        {getStatusBadge(listing.isActive, listing.isAd)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-lg text-green-600" data-testid={`text-price-${listing.id}`}>
                            {listing.price} {listing.currency}
                          </span>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Eye className="h-4 w-4" />
                            <span data-testid={`text-views-${listing.id}`}>{listing.views} vues</span>
                          </div>
                        </div>
                        {listing.location && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <MapPin className="h-4 w-4" />
                            <span data-testid={`text-location-${listing.id}`}>{listing.location}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-400" data-testid={`text-created-${listing.id}`}>
                          Créée le {new Date(listing.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label htmlFor={`status-${listing.id}`} className="text-sm font-medium">
                        {listing.isActive === 1 ? 'Actif' : 'Inactif'}
                      </label>
                      <Switch
                        id={`status-${listing.id}`}
                        checked={listing.isActive === 1}
                        onCheckedChange={() => handleToggleStatus(listing.id, listing.isActive)}
                        disabled={toggleStatusMutation.isPending}
                        data-testid={`switch-status-${listing.id}`}
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/listing/${listing.id}`, '_blank')}
                      data-testid={`button-view-${listing.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500" data-testid="text-no-listings">
                Aucune annonce trouvée
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Statistiques des Annonces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-total-listings">
                {listings?.length || 0}
              </div>
              <div className="text-sm text-blue-600">Total Annonces</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600" data-testid="stat-active-listings">
                {listings?.filter((l: any) => l.isActive === 1).length || 0}
              </div>
              <div className="text-sm text-green-600">Actives</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600" data-testid="stat-ad-listings">
                {listings?.filter((l: any) => l.isAd === 1).length || 0}
              </div>
              <div className="text-sm text-yellow-600">Publicités</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600" data-testid="stat-total-views">
                {listings?.reduce((total: number, l: any) => total + (l.views || 0), 0) || 0}
              </div>
              <div className="text-sm text-purple-600">Vues Totales</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}