import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Mail, User, Check, Car, MessageSquare, MapPin, Save, Edit, Plus, Calendar } from "lucide-react";
import type { Listing } from "@shared/schema";

const profileSchema = z.object({
  displayName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
  bio: z.string().max(500, "La bio ne peut pas dépasser 500 caractères").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isConnected } = useWebSocket();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      bio: user?.bio || "",
    },
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-20">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-20">
        <div className="bg-white">
          {/* Profile Header */}
          <div className="px-4 py-6 border-b border-border">
            <div className="flex items-center space-x-3 mb-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setLocation('/')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
              <h2 className="text-xl font-semibold text-foreground" data-testid="text-profile-title">
                Mon Profil
              </h2>
            </div>
            
            {/* User Profile Card */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center relative">
                {user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xl font-bold">
                    {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </span>
                )}
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full flex items-center justify-center`}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-foreground" data-testid="text-username">
                  {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur'}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isConnected ? 'En ligne' : 'Hors ligne'}
                  </span>
                  <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        data-testid="button-edit-profile"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Modifier le profil</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(() => {})} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="displayName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nom d'affichage</FormLabel>
                                <FormControl>
                                  <Input placeholder="Votre nom" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bio</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Parlez-nous de vous..."
                                    rows={3}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setEditModalOpen(false)}
                            >
                              Annuler
                            </Button>
                            <Button type="submit" className="bg-primary hover:bg-red-600">
                              <Save className="w-4 h-4 mr-2" />
                              Enregistrer
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
            
            {/* User Details */}
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Nom d'affichage</p>
                <p className="text-sm text-muted-foreground" data-testid="text-display-name">
                  {user.displayName || 'Non renseigné'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Biographie</p>
                <p className="text-sm text-muted-foreground" data-testid="text-bio">
                  {user.bio || 'Aucune biographie'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Account Information */}
          <div className="p-4">
            <h3 className="text-lg font-medium text-foreground mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Informations du compte
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-email">
                    {user.email || 'Non renseigné'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Membre depuis</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-member-since">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                  </p>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <div className="mt-6 pt-6 border-t border-border">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
