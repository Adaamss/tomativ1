import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useLocation, useRoute } from "wouter";
import { Plus, Camera, X, MapPin, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Listing } from "@shared/schema";

const editListingFormSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  price: z.string().min(1),
  categoryId: z.string().min(1),
  location: z.string().min(3),
  condition: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  mileage: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
});

type EditListingFormData = z.infer<typeof editListingFormSchema>;

export default function EditListing() {
  const [match, params] = useRoute("/edit-listing/:id");
  const listingId = params?.id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [categorySlug, setCategorySlug] = useState<string>("");

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
    },
  });

  const { data: listing } = useQuery<Listing>({
    queryKey: ["/api/listings", listingId],
    queryFn: async () => {
      console.log("[Fetch] Getting listing:", listingId);
      const res = await apiRequest("GET", `/api/listings/${listingId}`);
      if (!res.ok) throw new Error("Failed to fetch listing");
      return res.json();
    },
    enabled: !!listingId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  useEffect(() => {
    if (listing) {
      console.log("[Prefill] Listing loaded:", listing);
      form.reset({
        title: listing.title || "",
        description: listing.description || "",
        price: listing.price?.toString() || "",
        categoryId: listing.categoryId || "",
        location: listing.location || "",
        condition: listing.condition || "",
        brand: listing.brand || "",
        model: listing.model || "",
        year: listing.year ? listing.year.toString() : "",
        mileage: listing.mileage ? listing.mileage.toString() : "",
        fuelType: listing.fuelType || "",
        transmission: listing.transmission || "",
      });
      setUploadedImages(listing.images || []);
      const cat = categories.find((c: any) => c.id === listing.categoryId);
      if (cat) setCategorySlug(cat.slug || "");
    }
  }, [listing, categories]);

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadComplete = (result: any) => {
    console.log("[Uploader] Result:", result);
    const urls = result.successful.map(
      (file: any) => file.uploadURL || file.response?.body?.uploadURL
    );
    console.log("[Uploader] Extracted URLs:", urls);
    setUploadedImages(prev => [...prev, ...urls]);
  };

  // Mutation for update
  const updateListingMutation = useMutation({
    mutationFn: async (data: EditListingFormData) => {
      // Convert numbers properly
      const payload = {
        ...data,
        price: data.price || undefined, // keep string
        year: data.year ? Number(data.year) : undefined,
        mileage: data.mileage ? Number(data.mileage) : undefined,
        images: uploadedImages,
      };

      console.log("[Submit] Cleaned payload:", payload);

      const res = await apiRequest("PUT", `/api/listings/${listingId}`, payload);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[Submit] API error response:", errorText);
        throw new Error(errorText);
      }
      const updated = await res.json();
      console.log("[Submit] Updated listing from server:", updated);
      return updated;
    },
    onSuccess: () => {
      toast({ title: "Annonce mise à jour", description: "Vos changements ont été enregistrés." });
      queryClient.invalidateQueries({ queryKey: ["/api/listings", listingId] });
      setLocation(`/listing/${listingId}`);
    },
    onError: (err) => {
      console.error("[Submit] Mutation error:", err);
      toast({ title: "Erreur", description: "Impossible de mettre à jour l'annonce." });
    }
  });

  const onSubmit = (data: EditListingFormData) => {
    console.log("[Form] Raw submitted data:", data);
    updateListingMutation.mutate(data);
  };

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Annonce introuvable</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">L'annonce que vous souhaitez modifier n'existe pas.</p>
            <Button onClick={() => setLocation("/")}>Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation(`/listing/${listingId}`)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'annonce
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Modifier votre annonce</h1>
          <p className="text-gray-600">Modifiez les informations de votre annonce</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Photos ({uploadedImages.length}/5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ObjectUploader
                  maxNumberOfFiles={5 - uploadedImages.length}
                  maxFileSize={10485760}
                  onComplete={handleUploadComplete}
                  buttonClassName="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter des photos ({uploadedImages.length}/5)
                </ObjectUploader>
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img src={imageUrl} alt={`Upload ${index + 1}`} className="w-full h-32 object-cover rounded-lg border-2 border-gray-200" />
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
              </CardContent>
            </Card>

            {/* General Info */}
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
                        <Input placeholder="Ex: Volkswagen Golf 7 TDI 2016" {...field} />
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
                        <Textarea placeholder="Décrivez votre produit en détail..." rows={4} {...field} />
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
                          <Input type="number" placeholder="23456" {...field} />
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
                        <Input placeholder="Tunis, Tunisie" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Buttons */}
            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={() => setLocation(`/listing/${listingId}`)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateListingMutation.isPending}>
                {updateListingMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
