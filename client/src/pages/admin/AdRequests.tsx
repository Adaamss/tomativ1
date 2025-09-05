import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { AlertCircle, Check, X, Star, Package } from "lucide-react";
import AdminNavigation from "@/components/AdminNavigation";

export default function AdminAdRequests() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [adminMessages, setAdminMessages] = useState<{[key: string]: string}>({});

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/';
    }
  }, [user, authLoading]);

  const { data: adRequests, isLoading } = useQuery({
    queryKey: ['/api/admin/ad-requests'],
    enabled: !!user && user.role === 'admin',
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, adminMessage }: { requestId: string; status: string; adminMessage?: string }) => {
      await apiRequest(`/api/admin/ad-requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminMessage })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ad-requests'] });
      setAdminMessages({});
      toast({
        title: "Succès",
        description: "Demande de publicité traitée avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec du traitement de la demande",
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

  const handleUpdateRequest = (requestId: string, status: string) => {
    const adminMessage = adminMessages[requestId] || '';
    updateRequestMutation.mutate({ requestId, status, adminMessage });
  };

  const handleMessageChange = (requestId: string, message: string) => {
    setAdminMessages(prev => ({ ...prev, [requestId]: message }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">En attente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Approuvée</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Refusée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminNavigation />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <AlertCircle className="h-8 w-8" />
          Demandes de Publicité
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Traiter les demandes de promotion d'annonces
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Demandes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {adRequests && adRequests.length > 0 ? (
              adRequests.map((request: any) => (
                <div 
                  key={request.id} 
                  className="border rounded-lg p-6"
                  data-testid={`request-row-${request.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                          <Star className="h-6 w-6 text-orange-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-lg" data-testid={`text-request-title-${request.id}`}>
                          Demande de Publicité
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-request-date-${request.id}`}>
                          Demandée le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div data-testid={`badge-status-${request.id}`}>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>

                  {request.requestMessage && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Message de l'utilisateur :</h4>
                      <p className="text-sm" data-testid={`text-user-message-${request.id}`}>
                        {request.requestMessage}
                      </p>
                    </div>
                  )}

                  {request.adminMessage && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Réponse admin :</h4>
                      <p className="text-sm" data-testid={`text-admin-message-${request.id}`}>
                        {request.adminMessage}
                      </p>
                    </div>
                  )}

                  {/* Listing Preview */}
                  <div className="mb-4 p-3 border rounded-lg bg-white dark:bg-gray-900">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Aperçu de l'annonce
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      ID: <span data-testid={`text-listing-id-${request.id}`}>{request.listingId}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/listing/${request.listingId}`, '_blank')}
                      className="mt-2"
                      data-testid={`button-view-listing-${request.id}`}
                    >
                      Voir l'annonce
                    </Button>
                  </div>

                  {request.status === 'pending' && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Message pour l'utilisateur (optionnel)"
                        value={adminMessages[request.id] || ''}
                        onChange={(e) => handleMessageChange(request.id, e.target.value)}
                        className="min-h-[80px]"
                        data-testid={`textarea-admin-message-${request.id}`}
                      />
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateRequest(request.id, 'approved')}
                          disabled={updateRequestMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`button-approve-${request.id}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleUpdateRequest(request.id, 'rejected')}
                          disabled={updateRequestMutation.isPending}
                          data-testid={`button-reject-${request.id}`}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  )}

                  {request.reviewedAt && (
                    <div className="mt-3 text-xs text-gray-500" data-testid={`text-reviewed-${request.id}`}>
                      Traitée le {new Date(request.reviewedAt).toLocaleDateString('fr-FR')} à {new Date(request.reviewedAt).toLocaleTimeString('fr-FR')}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500" data-testid="text-no-requests">
                Aucune demande de publicité trouvée
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Statistiques des Demandes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-total-requests">
                {adRequests?.length || 0}
              </div>
              <div className="text-sm text-blue-600">Total Demandes</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600" data-testid="stat-pending-requests">
                {adRequests?.filter((r: any) => r.status === 'pending').length || 0}
              </div>
              <div className="text-sm text-yellow-600">En Attente</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600" data-testid="stat-approved-requests">
                {adRequests?.filter((r: any) => r.status === 'approved').length || 0}
              </div>
              <div className="text-sm text-green-600">Approuvées</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600" data-testid="stat-rejected-requests">
                {adRequests?.filter((r: any) => r.status === 'rejected').length || 0}
              </div>
              <div className="text-sm text-red-600">Refusées</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}