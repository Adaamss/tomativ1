import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { User, Users, Shield } from "lucide-react";
import AdminNavigation from "@/components/AdminNavigation";

export default function AdminUsers() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/';
    }
  }, [user, authLoading]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: !!user && user.role === 'admin',
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Succès",
        description: "Rôle utilisateur mis à jour avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour du rôle",
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

  const handleRoleChange = (userId: string, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminNavigation />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Users className="h-8 w-8" />
          Gestion des Utilisateurs
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gérer les rôles et permissions des utilisateurs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users && users.length > 0 ? (
              users.map((u: any) => (
                <div 
                  key={u.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`user-row-${u.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {u.profileImageUrl ? (
                        <img 
                          src={u.profileImageUrl} 
                          alt={`${u.firstName} ${u.lastName}`}
                          className="h-10 w-10 rounded-full object-cover"
                          data-testid={`img-profile-${u.id}`}
                        />
                      ) : (
                        <div 
                          className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                          data-testid={`avatar-default-${u.id}`}
                        >
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium" data-testid={`text-name-${u.id}`}>
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-email-${u.id}`}>
                        {u.email}
                      </div>
                      <div className="text-xs text-gray-400" data-testid={`text-created-${u.id}`}>
                        Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge 
                      variant={u.role === 'admin' ? 'default' : 'secondary'}
                      data-testid={`badge-role-${u.id}`}
                    >
                      {u.role === 'admin' ? (
                        <><Shield className="h-3 w-3 mr-1" />Admin</>
                      ) : (
                        <><User className="h-3 w-3 mr-1" />Utilisateur</>
                      )}
                    </Badge>
                    
                    <Select
                      value={u.role}
                      onValueChange={(role) => handleRoleChange(u.id, role)}
                      disabled={updateRoleMutation.isPending}
                      data-testid={`select-role-${u.id}`}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user" data-testid="option-user">Utilisateur</SelectItem>
                        <SelectItem value="admin" data-testid="option-admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500" data-testid="text-no-users">
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Statistiques Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-total-users">
                {users?.length || 0}
              </div>
              <div className="text-sm text-blue-600">Total Utilisateurs</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600" data-testid="stat-admin-users">
                {users?.filter((u: any) => u.role === 'admin').length || 0}
              </div>
              <div className="text-sm text-green-600">Administrateurs</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600" data-testid="stat-regular-users">
                {users?.filter((u: any) => u.role !== 'admin').length || 0}
              </div>
              <div className="text-sm text-purple-600">Utilisateurs Standard</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}