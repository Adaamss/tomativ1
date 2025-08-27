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
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Car, Upload } from "lucide-react";
import type { Category } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

const carListingSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  categoryId: z.string().optional(),
  location: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  mileage: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  condition: z.string().optional(),
});

type CarListingFormData = z.infer<typeof carListingSchema>;

export default function CreateListing() {
  const [step, setStep] = useState(1);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    retry: false,
  });

  // Get the car category (voiture)
  const carCategory = categories.find(cat => cat.slug === 'voiture');

  const form = useForm<CarListingFormData>({
    resolver: zodResolver(carListingSchema),
    defaultValues: {
      categoryId: carCategory?.id || '',
      title: '',
      description: '',
      price: '',
      location: '',
      brand: '',
      model: '',
      year: '',
      mileage: '',
      fuelType: '',
      transmission: '',
      condition: '',
    },
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: CarListingFormData) => {
      const payload = {
        title: data.title || '',
        description: data.description || '',
        price: data.price ? parseFloat(data.price) : null,
        year: data.year ? parseInt(data.year) : null,
        mileage: data.mileage ? parseInt(data.mileage) : null,
        currency: 'TND',
        categoryId: carCategory?.id || '',
        location: data.location || '',
        brand: data.brand || '',
        model: data.model || '',
        fuelType: data.fuelType || null,
        transmission: data.transmission || null,
        condition: data.condition || null,
        images: uploadedImages,
      };
      
      return await apiRequest("POST", "/api/listings", payload);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Votre annonce a été créée avec succès !",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      setLocation('/');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const newImages: string[] = [];
    
    if (result.successful) {
      for (const file of result.successful) {
        try {
          // Set ACL policy for the uploaded image
          const aclResponse = await apiRequest("PUT", "/api/listing-images", {
            imageURL: file.uploadURL || ""
          });
          const aclData = await aclResponse.json();
          newImages.push(aclData.objectPath);
        } catch (error) {
          console.error("Error setting ACL for image:", error);
          // Still add the image even if ACL setting fails
          if (file.uploadURL) {
            newImages.push(file.uploadURL);
          }
        }
      }
    }
    
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const validateStep1 = (data: CarListingFormData) => {
    if (!data.brand) {
      form.setError('brand', { message: 'La marque est requise' });
      return false;
    }
    if (!data.model) {
      form.setError('model', { message: 'Le modèle est requis' });
      return false;
    }
    if (!data.year) {
      form.setError('year', { message: 'L\'année est requise' });
      return false;
    }
    if (!data.mileage) {
      form.setError('mileage', { message: 'Le kilométrage est requis' });
      return false;
    }
    if (!data.price) {
      form.setError('price', { message: 'Le prix est requis' });
      return false;
    }
    return true;
  };

  const validateStep3 = (data: CarListingFormData) => {
    if (!data.title) {
      form.setError('title', { message: 'Le titre est requis' });
      return false;
    }
    if (!data.location) {
      form.setError('location', { message: 'La localisation est requise' });
      return false;
    }
    return true;
  };

  const onSubmit = (data: CarListingFormData) => {
    if (step === 1) {
      if (validateStep1(data)) {
        setStep(2);
      }
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (validateStep3(data)) {
        createListingMutation.mutate(data);
      }
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      setLocation('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-20">
        <div className="bg-white min-h-screen">
          {/* Create Listing Header */}
          <div className="px-4 py-6 border-b border-border">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Car className="w-8 h-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-listing-title">
                  Vendre une voiture
                </h1>
              </div>
              <p className="text-muted-foreground mb-6">
                Complétez les 3 étapes pour publier votre annonce
              </p>
              
              {/* Progress Steps */}
              <div className="flex items-center justify-center space-x-8 mb-8">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 ${step >= 1 ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'} rounded-full flex items-center justify-center font-semibold mb-2`}>
                    1
                  </div>
                  <span className={`text-sm ${step >= 1 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    Infos générales
                  </span>
                </div>
                
                <div className="flex-1 h-px bg-border mx-4"></div>
                
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 ${step >= 2 ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'} rounded-full flex items-center justify-center font-semibold mb-2`}>
                    2
                  </div>
                  <span className={`text-sm ${step >= 2 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    Caractéristiques
                  </span>
                </div>
                
                <div className="flex-1 h-px bg-border mx-4"></div>
                
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 ${step >= 3 ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'} rounded-full flex items-center justify-center font-semibold mb-2`}>
                    3
                  </div>
                  <span className={`text-sm ${step >= 3 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    Détails
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Form Content */}
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {step === 1 && (
                  <>
                    <h2 className="text-xl font-semibold text-foreground mb-6">Informations générales</h2>
                    
                    {/* Photo Upload Section */}
                    <div className="mb-8">
                      <h3 className="text-lg font-medium text-foreground mb-4">Photos du véhicule</h3>
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <div className="flex flex-col items-center">
                          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                          <h4 className="text-lg font-medium text-foreground mb-2">Ajouter des photos</h4>
                          <ObjectUploader
                            maxNumberOfFiles={8}
                            maxFileSize={10485760}
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={handleUploadComplete}
                            buttonClassName="bg-white border border-border text-foreground hover:bg-secondary"
                          >
                            <div className="flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              <span>Sélectionner des images</span>
                            </div>
                          </ObjectUploader>
                          <p className="text-sm text-muted-foreground mt-3">
                            {uploadedImages.length}/8 images • PNG, JPG jusqu'à 10MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marque du véhicule</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-brand">
                                <SelectValue placeholder="Sélectionnez une marque" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="toyota">Toyota</SelectItem>
                              <SelectItem value="peugeot">Peugeot</SelectItem>
                              <SelectItem value="renault">Renault</SelectItem>
                              <SelectItem value="volkswagen">Volkswagen</SelectItem>
                              <SelectItem value="nissan">Nissan</SelectItem>
                              <SelectItem value="hyundai">Hyundai</SelectItem>
                            </SelectContent>
                          </Select>
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
                            <Input placeholder="Ex: Corolla, 208, etc." {...field} data-testid="input-model" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Année</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-year">
                                  <SelectValue placeholder="Année de fabrication" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 25 }, (_, i) => {
                                  const year = 2024 - i;
                                  return (
                                    <SelectItem key={year} value={year.toString()}>
                                      {year}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
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
                              <Input type="number" placeholder="Km parcourus" {...field} data-testid="input-mileage" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix (TND)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Prix de vente" {...field} data-testid="input-price" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="text-xl font-semibold text-foreground mb-6">Caractéristiques</h2>
                    
                    <FormField
                      control={form.control}
                      name="fuelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de carburant</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-fuel-type">
                                <SelectValue placeholder="Sélectionnez le carburant" />
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
                              <SelectTrigger data-testid="select-transmission">
                                <SelectValue placeholder="Type de transmission" />
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

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>État du véhicule</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-condition">
                                <SelectValue placeholder="État général" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="excellent">Excellent</SelectItem>
                              <SelectItem value="tres-bon">Très bon</SelectItem>
                              <SelectItem value="bon">Bon</SelectItem>
                              <SelectItem value="correct">Correct</SelectItem>
                              <SelectItem value="a-reparer">À réparer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 3 && (
                  <>
                    <h2 className="text-xl font-semibold text-foreground mb-6">Détails finaux</h2>
                    
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titre de l'annonce</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Toyota Corolla 2020 - Excellent état" {...field} data-testid="input-title" />
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
                              placeholder="Décrivez votre véhicule, ses avantages, son historique..."
                              className="min-h-[120px]"
                              {...field}
                              data-testid="textarea-description"
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-location">
                                <SelectValue placeholder="Sélectionnez votre ville" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="tunis">Tunis</SelectItem>
                              <SelectItem value="sfax">Sfax</SelectItem>
                              <SelectItem value="sousse">Sousse</SelectItem>
                              <SelectItem value="bizerte">Bizerte</SelectItem>
                              <SelectItem value="gabes">Gabès</SelectItem>
                              <SelectItem value="kairouan">Kairouan</SelectItem>
                              <SelectItem value="gafsa">Gafsa</SelectItem>
                              <SelectItem value="monastir">Monastir</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                {/* Form Actions */}
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    data-testid="button-back"
                  >
                    {step === 1 ? 'Annuler' : 'Précédent'}
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-primary hover:bg-red-600"
                    disabled={createListingMutation.isPending}
                    data-testid="button-next"
                  >
                    {createListingMutation.isPending ? 'Création...' : step === 3 ? 'Publier' : 'Suivant'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
