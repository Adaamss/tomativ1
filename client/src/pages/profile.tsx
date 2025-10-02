import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import Footer from "@/components/Footer";
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
import { normalizeImageUrl } from "@/lib/imageUtils";
import { ArrowLeft, Mail, User, Check, Car, Heart, Edit, Save, Plus, Camera } from "lucide-react";
import type { Listing } from "@shared/schema";
import ProductCard from "@/components/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserLikes } from "@/hooks/useLikes";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from '@uppy/core';

const profileSchema = z.object({
  displayName: z.string().min(2, "Le nom doit contenir au moins 2 caractères").optional(),
  bio: z.string().max(500, "La bio ne peut pas dépasser 500 caractères").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: userListings = [] } = useQuery<Listing[]>({
    queryKey: [`/api/listings/user/${user?.id}`],
    enabled: !!user,
  });

  const { data: likedListings = [] } = useUserLikes(user?.id || '') as { data: Listing[] };

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileFormData & { profileImageUrl?: string }) => {
      const response = await apiRequest('PUT', '/api/profile', profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setEditModalOpen(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès.",
      });
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Dynamic upload parameters for ObjectUploader
  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    const { uploadURL } = await response.json();
    return {
      method: 'PUT' as const,
      url: uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      console.log("[Profile] upload complete result:", result);

      if (!result || !result.successful || result.successful.length === 0) {
        console.warn("[Profile] No successful uploads found");
        return;
      }

      const uploaded = result.successful[0];
      console.log("[Profile] successful file object:", uploaded);

      const uploadURL =
        (uploaded as any).uploadURL ??
        (uploaded as any).response?.body?.uploadURL ??
        (uploaded as any).response?.uploadURL ??
        null;

      console.log("[Profile] extracted uploadURL:", uploadURL);

      if (!uploadURL) {
        console.error("[Profile] No uploadURL found in result — aborting.");
        return;
      }

      const payload = { profileImageURL: uploadURL }; // server currently accepts this key
      console.log("[Profile] Sending PUT /api/profile-image with payload:", payload);

      await apiRequest("PUT", "/api/profile-image", payload);

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Photo mise à jour",
        description: "Votre photo de profil a été changée avec succès.",
      });
    } catch (err) {
      console.error("Error updating profile image:", err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la photo de profil.",
        variant: "destructive",
      });
    }
  };



  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      bio: user?.bio || "",
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => window.location.href = "/login", 500);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-20 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </main>
      <BottomNavigation />
    </div>
  );

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-20">
        <div className="bg-white">
          {/* Profile Header */}
          <div className="px-4 py-6 border-b border-border">
            <div className="flex items-center space-x-3 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
              <h2 className="text-xl font-semibold text-foreground">Mon Profil</h2>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center relative group">
                {user.profileImageUrl ? (
                  <img
                    src={normalizeImageUrl(user.profileImageUrl)}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xl font-bold">
                    {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </span>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>

                <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880}
                    getUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="bg-transparent hover:bg-transparent p-2"
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </ObjectUploader>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-medium text-foreground">
                  {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur'}
                </h3>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="p-4">
            <Tabs defaultValue="account">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="account">Compte</TabsTrigger>
                <TabsTrigger value="products">Mes Produits</TabsTrigger>
                <TabsTrigger value="favorites">Mes Favoris</TabsTrigger>
              </TabsList>

              {/* Account Tab */}
              <TabsContent value="account" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-secondary rounded-lg">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Email</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="mt-4">
                {userListings.length > 0 ? (
                  <div className="grid gap-4">
                    {userListings.map((listing) => (
                      <ProductCard
                        key={listing.id}
                        listing={listing}
                        onClick={() => setLocation(`/product/${listing.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Vous n'avez publié aucun produit</p>
                    <Button onClick={() => setLocation('/create-listing')} className="mt-4">
                      <Plus className="w-4 h-4 mr-2" /> Publier une annonce
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Favorites Tab */}
              <TabsContent value="favorites" className="mt-4">
                {likedListings.length > 0 ? (
                  <div className="grid gap-4">
                    {likedListings.map((listing) => (
                      <ProductCard
                        key={listing.id}
                        listing={listing}
                        onClick={() => setLocation(`/product/${listing.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Vous n'avez aucun produit en favori</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
