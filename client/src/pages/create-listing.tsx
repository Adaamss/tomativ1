import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ObjectUploader } from "@/components/ObjectUploader";
import { LocationPicker } from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Car, Upload } from "lucide-react";
import type { Category } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

// Schémas
const baseListingSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  price: z.string().min(1, "Le prix est requis"),
  categoryId: z.string().min(1, "La catégorie est requise"),
  location: z.string().min(1, "La localisation est requise"),
  condition: z.string().optional(),
});

const carListingSchema = baseListingSchema.extend({
  brand: z.string().min(1, "La marque est requise"),
  model: z.string().min(1, "Le modèle est requis"),
  year: z.string().min(1, "L'année est requise"),
  mileage: z.string().min(1, "Le kilométrage est requis"),
  fuelType: z.string().min(1, "Le type de carburant est requis"),
  transmission: z.string().min(1, "La transmission est requise"),
});

const realEstateListingSchema = baseListingSchema.extend({
  propertyType: z.string().min(1, "Le type de bien est requis"),
  surface: z.string().min(1, "La superficie est requise"),
  rooms: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  floor: z.string().optional(),
});

const jobListingSchema = baseListingSchema.extend({
  jobType: z.string().min(1, "Le type de contrat est requis"),
  experience: z.string().min(1, "L'expérience requise est requise"),
  salary: z.string().optional(),
  sector: z.string().min(1, "Le secteur est requis"),
});

const generalListingSchema = baseListingSchema;

type ListingFormData = z.infer<typeof carListingSchema> &
  z.infer<typeof realEstateListingSchema> &
  z.infer<typeof jobListingSchema>;

export default function CreateListing() {
  const [step, setStep] = useState(1);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [selectedLocation, setSelectedLocation] = useState({ name: "", lat: 36.8065, lng: 10.1815 });
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    retry: false,
  });

  const selectedCategory = categories.find(
    (cat) => cat.slug === selectedCategorySlug,
  );

  const getFormSchema = () => {
    switch (selectedCategorySlug) {
      case "voiture":
        return carListingSchema;
      case "immobilier":
        return realEstateListingSchema;
      case "emploi":
        return jobListingSchema;
      default:
        return generalListingSchema;
    }
  };

  const form = useForm<ListingFormData>({
    resolver: zodResolver(getFormSchema()),
    defaultValues: {
      categoryId: selectedCategory?.id || "",
      title: "",
      description: "",
      price: "",
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

  const handleCategoryChange = (categoryId: string) => {
    console.log("Category changed to:", categoryId);
    const category = categories.find((cat) => cat.id === categoryId);
    console.log("Found category:", category);
    if (category) {
      setSelectedCategorySlug(category.slug);
      form.setValue("categoryId", categoryId);
      console.log("Set category slug to:", category.slug);
    }
  };

  const createListingMutation = useMutation({
    mutationFn: async (data: ListingFormData) => {
      const basePayload = {
        title: data.title,
        description: data.description || undefined,
        price: data.price,
        currency: "TND",
        categoryId: data.categoryId,
        location: data.location,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        condition: data.condition || undefined,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
      };
      const payload: any = { ...basePayload };
      if (selectedCategorySlug === "voiture") {
        payload.brand = data.brand;
        payload.model = data.model;
        payload.year = data.year ? parseInt(data.year) : undefined;
        payload.mileage = data.mileage ? parseInt(data.mileage) : undefined;
        payload.fuelType = data.fuelType;
        payload.transmission = data.transmission;
      } else if (selectedCategorySlug === "immobilier") {
        payload.propertyType = data.propertyType;
        payload.surface = data.surface ? parseInt(data.surface) : undefined;
        payload.rooms = data.rooms ? parseInt(data.rooms) : undefined;
        payload.bedrooms = data.bedrooms ? parseInt(data.bedrooms) : undefined;
        payload.bathrooms = data.bathrooms
          ? parseInt(data.bathrooms)
          : undefined;
        payload.floor = data.floor ? parseInt(data.floor) : undefined;
      } else if (selectedCategorySlug === "emploi") {
        payload.jobType = data.jobType;
        payload.experience = data.experience;
        payload.salary = data.salary ? parseFloat(data.salary) : undefined;
        payload.sector = data.sector;
      }

      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== undefined),
      );

      return await apiRequest("POST", "/api/listings", cleanPayload);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Votre annonce a été créée avec succès !",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      setLocation("/");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible de créer l'annonce. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const handleUploadComplete = async (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>,
  ) => {
    const newImages: string[] = [];
    if (result.successful) {
      for (const file of result.successful) {
        newImages.push(file.uploadURL || "");
      }
    }
    setUploadedImages((prev) => [...prev, ...newImages]);
  };

  const validateStep1 = (data: ListingFormData) => {
    console.log("Validating step 1 with categoryId:", data.categoryId);
    if (!data.categoryId) {
      console.log("Step 1 validation failed: no categoryId");
      return false;
    }
    console.log("Step 1 validation passed");
    return true;
  };

  const validateStep2 = (data: ListingFormData) => {
    if (selectedCategorySlug === "voiture") {
      if (!data.brand || !data.model || !data.year || !data.mileage || !data.fuelType || !data.transmission) return false;
    } else if (selectedCategorySlug === "immobilier") {
      if (!data.propertyType || !data.surface) return false;
    } else if (selectedCategorySlug === "emploi") {
      if (!data.jobType || !data.experience || !data.sector) return false;
    }
    return true;
  };

  const validateStep3 = (data: ListingFormData) => {
    if (!data.title || !data.location || !data.price) return false;
    return true;
  };

  const onSubmit = (data: ListingFormData) => {
    console.log("=== onSubmit called ===");
    console.log("Submitting step", step, "with data:", data);
    console.log("Selected category slug:", selectedCategorySlug);
    console.log("Form errors:", form.formState.errors);
    
    if (step === 1) {
      console.log("Processing step 1");
      if (validateStep1(data)) {
        console.log("Step 1 validation passed, moving to step 2");
        setStep(2);
      } else {
        console.log("Step 1 validation failed");
      }
    } else if (step === 2) {
      console.log("Processing step 2");
      if (validateStep2(data)) {
        console.log("Step 2 validation passed, moving to step 3");
        setStep(3);
      } else {
        console.log("Step 2 validation failed");
      }
    } else if (step === 3) {
      console.log("Processing step 3");
      if (validateStep3(data)) {
        console.log("Step 3 validation passed, creating listing");
        createListingMutation.mutate(data);
      } else {
        console.log("Step 3 validation failed");
      }
    }
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
    else setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-20">
        <div className="bg-white min-h-screen">
          {/* HEADER */}
          <div className="px-4 py-6 border-b border-border">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Car className="w-8 h-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-foreground">
                  Créer une annonce
                </h1>
              </div>
            </div>
          </div>

          <div className="p-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* STEP 1 */}
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catégorie</FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              handleCategoryChange(val);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez une catégorie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* STEP 2 - Car specific fields */}
                {step === 2 && selectedCategorySlug === "voiture" && (
                  <>
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marque</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: BMW, Mercedes, Peugeot..." />
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
                            <Input {...field} placeholder="Ex: X5, C220, 208..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Année</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="2020" />
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
                              <Input {...field} type="number" placeholder="50000" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fuelType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Carburant</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Carburant" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="essence">Essence</SelectItem>
                                <SelectItem value="diesel">Diesel</SelectItem>
                                <SelectItem value="hybride">Hybride</SelectItem>
                                <SelectItem value="electrique">Électrique</SelectItem>
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
                                  <SelectValue placeholder="Transmission" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="manuelle">Manuelle</SelectItem>
                                <SelectItem value="automatique">Automatique</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* STEP 2 - Real Estate specific fields */}
                {step === 2 && selectedCategorySlug === "immobilier" && (
                  <>
                    <FormField
                      control={form.control}
                      name="propertyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de bien</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Type de bien" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="appartement">Appartement</SelectItem>
                              <SelectItem value="maison">Maison</SelectItem>
                              <SelectItem value="villa">Villa</SelectItem>
                              <SelectItem value="terrain">Terrain</SelectItem>
                              <SelectItem value="bureau">Bureau</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="surface"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surface (m²)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="120" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="rooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pièces</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="3" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bedrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chambres</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="2" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bathrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salles de bain</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* STEP 2 - Job specific fields */}
                {step === 2 && selectedCategorySlug === "emploi" && (
                  <>
                    <FormField
                      control={form.control}
                      name="jobType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de contrat</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Type de contrat" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cdi">CDI</SelectItem>
                              <SelectItem value="cdd">CDD</SelectItem>
                              <SelectItem value="freelance">Freelance</SelectItem>
                              <SelectItem value="stage">Stage</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expérience requise</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Expérience" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="debutant">Débutant</SelectItem>
                              <SelectItem value="1-3 ans">1-3 ans</SelectItem>
                              <SelectItem value="3-5 ans">3-5 ans</SelectItem>
                              <SelectItem value="5+ ans">5+ ans</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sector"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secteur</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Informatique, Santé, Éducation..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salaire (TND) - Optionnel</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="1500" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* STEP 2 - General category (no specific fields) */}
                {step === 2 && !["voiture", "immobilier", "emploi"].includes(selectedCategorySlug) && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Aucun champ spécifique pour cette catégorie.</p>
                    <p className="text-sm text-gray-500 mt-2">Cliquez sur "Suivant" pour continuer.</p>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titre</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Titre de votre annonce"
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
                              {...field}
                              placeholder="Décrivez votre annonce..."
                              className="h-20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix (TND)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localisation</FormLabel>
                          <FormControl>
                            <LocationPicker
                              value={field.value}
                              latitude={selectedLocation.lat}
                              longitude={selectedLocation.lng}
                              onChange={(name, lat, lng) => {
                                field.onChange(name);
                                setSelectedLocation({ name, lat, lng });
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Upload Images */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Photos</label>
                      <ObjectUploader
                        maxNumberOfFiles={5}
                        maxFileSize={10485760} // 10MB
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleUploadComplete}
                        buttonClassName="w-full"
                      >
                        <div className="flex items-center justify-center py-4">
                          <Upload className="w-6 h-6 mr-2" />
                          Ajouter des photos ({uploadedImages.length}/5)
                        </div>
                      </ObjectUploader>
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {uploadedImages.map((img, idx) => (
                            <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img
                                src={img}
                                alt={`Upload ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  <Button type="button" variant="outline" onClick={goBack}>
                    {step === 1 ? "Annuler" : "Précédent"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createListingMutation.isPending}
                    onClick={() => console.log("Submit button clicked, current step:", step)}
                  >
                    {step === 3 ? "Publier" : "Suivant"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
