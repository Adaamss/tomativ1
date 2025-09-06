import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useLocation } from "wouter";
import { Plus, Camera, X, MapPin } from "lucide-react";

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

// Schema de validation pour le formulaire
const listingFormSchema = z.object({
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
});

type ListingFormData = z.infer<typeof listingFormSchema>;

export default function AddListing() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      categoryId: "",
      location: "Tunis, Tunisie",
      condition: "bon",
      brand: "",
      model: "",
      year: "",
      mileage: "",
      fuelType: "",
      transmission: "",
    },
  });

  // Récupération des catégories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Mutation pour créer une annonce
  const createListingMutation = useMutation({
    mutationFn: async (data: ListingFormData) => {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          price: parseFloat(data.price),
          year: data.year ? parseInt(data.year) : undefined,
          mileage: data.mileage ? parseInt(data.mileage) : undefined,
          images: uploadedImages,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création de l'annonce");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Succès !",
        description: "Votre annonce a été créée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      setLocation(`/listing/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'annonce. Veuillez réessayer.",
        variant: "destructive",
      });
      console.error("Erreur création annonce:", error);
    },
  });

  // Gestion de l'upload d'images
  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la génération de l'URL d'upload");
    }

    const { uploadURL } = await response.json();
    return {
      method: "PUT" as const,
      url: uploadURL,
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    console.log('handleUploadComplete called with:', result);
    
    if (result.successful && result.successful.length > 0) {
      const newImageUrls = result.successful.map((file) => file.uploadURL).filter(Boolean) as string[];
      console.log('New image URLs:', newImageUrls);
      setUploadedImages(prev => [...prev, ...newImageUrls]);
      
      toast({
        title: "Images uploadées !",
        description: `${result.successful.length} image(s) ajoutée(s) avec succès.`,
      });
    }
    
    if (result.failed && result.failed.length > 0) {
      console.error('Failed uploads:', result.failed);
      toast({
        title: "Erreur d'upload",
        description: `${result.failed.length} image(s) n'ont pas pu être uploadées.`,
        variant: "destructive",
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const onSubmit = (data: ListingFormData) => {
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour créer une annonce.",
        variant: "destructive",
      });
      return;
    }

    createListingMutation.mutate(data);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Connexion requise</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Vous devez être connecté pour créer une annonce.
            </p>
            <Button onClick={() => (window.location.href = "/api/login")}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Créer une nouvelle annonce
          </h1>
          <p className="text-gray-600">
            Remplissez les informations ci-dessous pour publier votre annonce
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Photos (obligatoire)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ObjectUploader
                    maxNumberOfFiles={5}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Détails véhicule */}
            <Card>
              <CardHeader>
                <CardTitle>Détails du véhicule (optionnel)</CardTitle>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Boutons d'action */}
            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createListingMutation.isPending || uploadedImages.length === 0}
              >
                {createListingMutation.isPending ? "Publication..." : "Publier l'annonce"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}