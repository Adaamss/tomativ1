import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import AdminNavigation from "@/components/AdminNavigation";
import { 
  AlertTriangle, 
  Eye, 
  Shield, 
  MessageSquare, 
  Package, 
  User,
  Clock,
  CheckCircle,
  XCircle,
  Archive
} from "lucide-react";

interface Report {
  id: string;
  type: "listing" | "user" | "review" | "message";
  targetId: string;
  reporterId: string;
  reason: string;
  description: string;
  status: "pending" | "investigating" | "resolved" | "dismissed";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Related data
  target?: any;
  reporter?: any;
}

export default function AdminReports() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/';
    }
  }, [user, authLoading]);

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['/api/admin/reports', filter],
    queryFn: () => apiRequest("GET", `/api/admin/reports?filter=${filter}`),
    enabled: !!user && user.role === 'admin',
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status, adminNotes }: { reportId: string; status: string; adminNotes?: string }) => {
      return await apiRequest("PUT", `/api/admin/reports/${reportId}`, {
        status,
        adminNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reports'] });
      toast({
        title: "Succès",
        description: "Signalement mis à jour avec succès",
      });
      setSelectedReport(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la mise à jour du signalement",
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

  const handleUpdateReport = (status: string) => {
    if (!selectedReport) return;
    updateReportMutation.mutate({
      reportId: selectedReport.id,
      status,
      adminNotes
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'investigating':
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><Eye className="w-3 h-3 mr-1" />Investigation</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Résolu</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="text-gray-600 border-gray-300"><XCircle className="w-3 h-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'listing':
        return <Package className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      case 'review':
        return <MessageSquare className="w-4 h-4" />;
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'listing':
        return 'Annonce';
      case 'user':
        return 'Utilisateur';
      case 'review':
        return 'Avis';
      case 'message':
        return 'Message';
      default:
        return type;
    }
  };

  const getPriorityColor = (reason: string) => {
    const highPriority = ['spam', 'harassment', 'inappropriate', 'fraud'];
    const mediumPriority = ['misleading', 'duplicate', 'off-topic'];
    
    if (highPriority.some(p => reason.toLowerCase().includes(p))) {
      return 'border-l-4 border-l-red-500';
    }
    if (mediumPriority.some(p => reason.toLowerCase().includes(p))) {
      return 'border-l-4 border-l-yellow-500';
    }
    return 'border-l-4 border-l-blue-500';
  };

  // Calculs de statistiques
  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    investigating: reports.filter(r => r.status === 'investigating').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    if (filter === 'high-priority') {
      const highPriority = ['spam', 'harassment', 'inappropriate', 'fraud'];
      return highPriority.some(p => report.reason.toLowerCase().includes(p));
    }
    return report.status === filter || report.type === filter;
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminNavigation />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="h-8 w-8" />
          Modération et Signalements
        </h1>
        <p className="text-gray-600 mt-2">
          Gérez les signalements et modérez le contenu de la plateforme
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-yellow-600">En attente</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.investigating}</div>
              <div className="text-sm text-blue-600">Investigation</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-sm text-green-600">Résolus</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.dismissed}</div>
              <div className="text-sm text-gray-600">Rejetés</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les signalements</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="investigating">Investigation</SelectItem>
            <SelectItem value="high-priority">Haute priorité</SelectItem>
            <SelectItem value="listing">Annonces</SelectItem>
            <SelectItem value="user">Utilisateurs</SelectItem>
            <SelectItem value="review">Avis</SelectItem>
            <SelectItem value="message">Messages</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des signalements */}
      <div className="space-y-4">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <Card key={report.id} className={`${getPriorityColor(report.reason)}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(report.type)}
                      <span className="font-medium">{getTypeLabel(report.type)}</span>
                    </div>
                    <Badge variant="outline">{report.reason}</Badge>
                    {getStatusBadge(report.status)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Description du signalement :</p>
                    <p className="text-gray-700">{report.description}</p>
                  </div>

                  {report.target && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 mb-1">Contenu signalé :</p>
                      <p className="text-gray-700 text-sm">
                        {report.type === 'listing' && report.target.title}
                        {report.type === 'user' && `${report.target.firstName} ${report.target.lastName}`}
                        {report.type === 'review' && report.target.comment}
                        {report.type === 'message' && report.target.content}
                      </p>
                    </div>
                  )}

                  {report.adminNotes && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Notes de l'administrateur :</p>
                      <p className="text-blue-800 text-sm">{report.adminNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Examiner
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Examiner le signalement</DialogTitle>
                        <DialogDescription>
                          Type: {getTypeLabel(report.type)} • Raison: {report.reason}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Description du signalement</label>
                          <div className="bg-gray-50 p-3 rounded mt-1">
                            <p className="text-sm">{report.description}</p>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Notes administrateur</label>
                          <Textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Ajoutez vos notes sur cette investigation..."
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateReport("investigating")}
                            disabled={updateReportMutation.isPending}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Investigation
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateReport("dismissed")}
                            disabled={updateReportMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                          <Button
                            onClick={() => handleUpdateReport("resolved")}
                            disabled={updateReportMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Résoudre
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {report.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          updateReportMutation.mutate({
                            reportId: report.id,
                            status: "investigating"
                          });
                        }}
                        disabled={updateReportMutation.isPending}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Investigation
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          updateReportMutation.mutate({
                            reportId: report.id,
                            status: "dismissed"
                          });
                        }}
                        disabled={updateReportMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Rejeter
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun signalement
              </h3>
              <p className="text-gray-500">
                Aucun signalement ne correspond aux filtres sélectionnés.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}