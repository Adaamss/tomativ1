import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ShoppingBag, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import AdminNavigation from "@/components/AdminNavigation";

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/';
    }
  }, [user, authLoading]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: !!user && user.role === 'admin',
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

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminNavigation />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard Administrateur
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Vue d'ensemble de la plateforme Tomati
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-users">
              {stats?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Utilisateurs inscrits sur la plateforme
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-listings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Annonces</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-listings">
              {stats?.totalListings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Annonces créées au total
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-active-listings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annonces Actives</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-listings">
              {stats?.totalActiveListings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Annonces actuellement visibles
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-ads">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandes Pub</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending-ads">
              {stats?.pendingAdRequests || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              En attente de validation
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-recent-activity">
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {stats?.totalAds || 0} publicités approuvées
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Annonces promues actuellement
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {stats?.pendingAdRequests || 0} demandes en attente
                  </p>
                  <p className="text-xs text-muted-foreground">
                    À traiter dans le panneau de gestion
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Taux d'activation: {stats?.totalActiveListings && stats?.totalListings ? 
                      Math.round((stats.totalActiveListings / stats.totalListings) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pourcentage d'annonces actives
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button 
                onClick={() => window.location.href = '/admin/ad-requests'}
                className="w-full text-left p-3 rounded-lg bg-orange-50 dark:bg-orange-950 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                data-testid="button-manage-ads"
              >
                <div className="font-medium text-orange-900 dark:text-orange-100">
                  Gérer les Demandes Pub
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">
                  {stats?.pendingAdRequests || 0} demande(s) en attente
                </div>
              </button>
              <button 
                onClick={() => window.location.href = '/admin/users'}
                className="w-full text-left p-3 rounded-lg bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                data-testid="button-manage-users"
              >
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  Gérer les Utilisateurs
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  {stats?.totalUsers || 0} utilisateur(s) total
                </div>
              </button>
              <button 
                onClick={() => window.location.href = '/admin/listings'}
                className="w-full text-left p-3 rounded-lg bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                data-testid="button-manage-listings"
              >
                <div className="font-medium text-green-900 dark:text-green-100">
                  Gérer les Annonces
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {stats?.totalActiveListings || 0}/{stats?.totalListings || 0} actives
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}