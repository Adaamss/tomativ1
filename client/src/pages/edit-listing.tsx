import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useLocation, useRoute } from "wouter";
import { Plus, Camera, X, MapPin, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { UploadResult } from "@uppy/core";
import type { Listing } from "@shared/schema";

// Schema de validation pour l'édition
const editListingFormSchema = z.object({
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères"),
  description: z.string().min(20, "La description doit contenir au moins 20 caractères"),
  price: z.string().min(1, "Le prix est obligatoire"),
  categoryId: z.string().min(1, "La catégorie est obligatoire"),
  location: z.string().min(3, "La localisation est obligatoire"),
  condition: z.string().optional(),
  // Champs spécifiques voiture
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  mileage: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  // Champs immobilier
  propertyType: z.string().optional(),
  surface: z.string().optional(),
  rooms: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  floor: z.string().optional(),
  // Champs emploi
  jobType: z.string().optional(),
  experience: z.string().optional(),
  salary: z.string().optional(),
  sector: z.string().optional(),
});

type EditListingFormData = z.infer<typeof editListingFormSchema>;

export default function EditListing() {
  const [match] = useRoute("/edit-listing/:id");
  const listingId = match?.id;
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Récupération de l'annonce à modifier
  const { data: listing, isLoading: listingLoading } = useQuery<Listing>({
    queryKey: ["/api/listings", listingId],
    queryFn: () => apiRequest("GET", `/api/listings/${listingId}`),
    enabled: !!listingId,
  });

  // Récupération des catégories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const form = useForm<EditListingFormData>({
    resolver: zodResolver(editListingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      categoryId: "",
      location: "",
      condition: "",
      brand: "",
      model: "",
      year: "",
      mileage: "",
      fuelType: "",
      transmission: "",
      propertyType: "",
      surface: "",
      rooms: "",
      bedrooms: "",
      bathrooms: "",
      floor: "",
      jobType: "",
      experience: "",
      salary: "",
      sector: "",
    },
  });

  // Remplir le formulaire avec les données existantes
  useEffect(() => {
    if (listing) {
      form.reset({
        title: listing.title || "",
        description: listing.description || "",
        price: listing.price?.toString() || "",
        categoryId: listing.categoryId || "",
        location: listing.location || "",
        condition: listing.condition || "",
        brand: listing.brand || "",
        model: listing.model || "",
        year: listing.year?.toString() || "",
        mileage: listing.mileage?.toString() || "",
        fuelType: listing.fuelType || "",
        transmission: listing.transmission || "",
        propertyType: listing.propertyType || "",
        surface: listing.surface?.toString() || "",
        rooms: listing.rooms?.toString() || "",
        bedrooms: listing.bedrooms?.toString() || "",
        bathrooms: listing.bathrooms?.toString() || "",
        floor: listing.floor?.toString() || "",
        jobType: listing.jobType || "",
        experience: listing.experience || "",
        salary: listing.salary?.toString() || "",
        sector: listing.sector || "",
      });
      setUploadedImages(listing.images || []);
    }
  }, [listing, form]);

  // Vérifier si l'utilisateur est propriétaire de l'annonce
  const isOwner = listing && user && listing.userId === user.id;

  // Mutation pour modifier une annonce
  const updateListingMutation = useMutation({
    mutationFn: async (data: EditListingFormData) => {
      return await apiRequest("PUT", `/api/listings/${listingId}`, {
        ...data,
        price: parseFloat(data.price),
        year: data.year ? parseInt(data.year) : undefined,
        mileage: data.mileage ? parseInt(data.mileage) : undefined,
        surface: data.surface ? parseInt(data.surface) : undefined,
        rooms: data.rooms ? parseInt(data.rooms) : undefined,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms) : undefined,
        bathrooms: data.bathrooms ? parseInt(data.bathrooms) : undefined,
        floor: data.floor ? parseInt(data.floor) : undefined,
        salary: data.salary ? parseFloat(data.salary) : undefined,
        images: uploadedImages,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Succès !",
        description: "Votre annonce a été modifiée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", listingId] });
      setLocation(`/listing/${listingId}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expirée",
          description: "Vous êtes déconnecté. Reconnexion...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'annonce. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  // Gestion de l'upload d'images
  const handleGetUploadParameters = async () => {
    const data = await apiRequest("POST", "/api/objects/upload");
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const newImageUrls = result.successful
        .map((file: any) => {
          const uploadURL = file.uploadURL || file.response?.uploadURL || file.source;
          if (uploadURL && typeof uploadURL === 'string' && uploadURL.includes('storage.googleapis.com')) {
            const url = new URL(uploadURL);
            const pathParts = url.pathname.split('/');
            const objectId = pathParts[pathParts.length - 1];
            return `/objects/uploads/${objectId}`;
          }
          return uploadURL;
        })
        .filter(Boolean) as string[];
      
      setUploadedImages(prev => [...prev, ...newImageUrls]);
      
      toast({
        title: "Images uploadées !",
        description: `${result.successful.length} image(s) ajoutée(s) avec succès.`,
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const onSubmit = (data: EditListingFormData) => {
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour modifier une annonce.",
        variant: "destructive",
      });
      return;
    }

    if (!isOwner) {
      toast({
        title: "Non autorisé",
        description: "Vous ne pouvez modifier que vos propres annonces.",
        variant: "destructive",
      });
      return;
    }

    updateListingMutation.mutate(data);
  };

  // États de chargement et d'erreur
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Connexion requise</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Vous devez être connecté pour modifier une annonce.
            </p>
            <Button onClick={() => (window.location.href = "/api/login")}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (listingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Chargement de l'annonce...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Annonce introuvable</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              L'annonce que vous souhaitez modifier n'existe pas.
            </p>
            <Button onClick={() => setLocation("/")}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Non autorisé</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Vous ne pouvez modifier que vos propres annonces.
            </p>
            <Button onClick={() => setLocation(`/listing/${listingId}`)}>
              Voir l'annonce
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedCategory = categories.find((cat: any) => cat.id === form.watch("categoryId"));
  const categorySlug = selectedCategory?.slug;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation(`/listing/${listingId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'annonce
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Modifier votre annonce
          </h1>
          <p className="text-gray-600">
            Modifiez les informations de votre annonce
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Photos ({uploadedImages.length}/5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ObjectUploader
                    maxNumberOfFiles={5 - uploadedImages.length}
                    maxFileSize={10485760}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter des photos ({uploadedImages.length}/5)
                  </ObjectUploader>

                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {uploadedImages.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre de l'annonce</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Volkswagen Golf 7 TDI 2016"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez votre produit en détail..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix (TND)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="23456"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégorie</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir une catégorie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(categories as any[]).map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Localisation
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tunis, Tunisie"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>État</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir l'état" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="neuf">Neuf</SelectItem>
                          <SelectItem value="tres_bon">Très bon état</SelectItem>
                          <SelectItem value="bon">Bon état</SelectItem>
                          <SelectItem value="correct">État correct</SelectItem>
                          <SelectItem value="a_reparer">À réparer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Détails spécifiques par catégorie */}
            {categorySlug === "voiture" && (
              <Card>
                <CardHeader>
                  <CardTitle>Détails du véhicule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marque</FormLabel>
                          <FormControl>
                            <Input placeholder="Volkswagen" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modèle</FormLabel>
                          <FormControl>
                            <Input placeholder="Golf 7" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Année</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2016" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kilométrage</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="145000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fuelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carburant</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Type de carburant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="essence">Essence</SelectItem>
                              <SelectItem value="diesel">Diesel</SelectItem>
                              <SelectItem value="hybride">Hybride</SelectItem>
                              <SelectItem value="electrique">Électrique</SelectItem>
                              <SelectItem value="gpl">GPL</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transmission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transmission</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Type de transmission" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="manuelle">Manuelle</SelectItem>
                              <SelectItem value="automatique">Automatique</SelectItem>
                              <SelectItem value="semi_automatique">Semi-automatique</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/listing/${listingId}`)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={updateListingMutation.isPending}
              >
                {updateListingMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}