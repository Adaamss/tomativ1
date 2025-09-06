import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DollarSign, MessageSquare, Check, X, RefreshCw, Clock, Send, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Listing, PriceNegotiation } from "@shared/schema";

const priceOfferSchema = z.object({
  offeredPrice: z.string().min(1, "Le prix est obligatoire"),
  message: z.string().optional(),
});

const negotiationResponseSchema = z.object({
  status: z.enum(["accepted", "rejected", "countered"]),
  counterPrice: z.string().optional(),
  sellerMessage: z.string().optional(),
});

type PriceOfferFormData = z.infer<typeof priceOfferSchema>;
type NegotiationResponseFormData = z.infer<typeof negotiationResponseSchema>;

interface PriceNegotiationProps {
  listing: Listing;
}

export default function PriceNegotiation({ listing }: PriceNegotiationProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [responseNegotiationId, setResponseNegotiationId] = useState<string | null>(null);

  // Formulaire pour faire une offre
  const offerForm = useForm<PriceOfferFormData>({
    resolver: zodResolver(priceOfferSchema),
    defaultValues: {
      offeredPrice: "",
      message: "",
    },
  });

  // Formulaire pour répondre à une négociation
  const responseForm = useForm<NegotiationResponseFormData>({
    resolver: zodResolver(negotiationResponseSchema),
    defaultValues: {
      status: "accepted",
      counterPrice: "",
      sellerMessage: "",
    },
  });

  // Récupération des négociations pour cette annonce
  const { data: negotiations = [], isLoading: negotiationsLoading } = useQuery<PriceNegotiation[]>({
    queryKey: ["/api/negotiations/listing", listing.id],
    queryFn: () => apiRequest("GET", `/api/negotiations/listing/${listing.id}`),
    enabled: !!listing.id && !!user,
  });

  // Mutation pour créer une offre
  const createOfferMutation = useMutation({
    mutationFn: async (data: PriceOfferFormData) => {
      return await apiRequest("POST", "/api/negotiations", {
        listingId: listing.id,
        sellerId: listing.userId,
        offeredPrice: parseFloat(data.offeredPrice),
        message: data.message,
      });
    },
    onSuccess: () => {
      toast({
        title: "Offre envoyée !",
        description: "Votre offre de prix a été envoyée au vendeur.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/negotiations/listing", listing.id] });
      setIsOfferModalOpen(false);
      offerForm.reset();
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
        description: "Impossible d'envoyer l'offre. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour répondre à une négociation
  const respondNegotiationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NegotiationResponseFormData }) => {
      return await apiRequest("PUT", `/api/negotiations/${id}`, {
        status: data.status,
        counterPrice: data.counterPrice ? parseFloat(data.counterPrice) : undefined,
        sellerMessage: data.sellerMessage,
      });
    },
    onSuccess: () => {
      toast({
        title: "Réponse envoyée !",
        description: "Votre réponse a été envoyée à l'acheteur.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/negotiations/listing", listing.id] });
      setResponseNegotiationId(null);
      responseForm.reset();
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
        description: "Impossible d'envoyer la réponse. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const onSubmitOffer = (data: PriceOfferFormData) => {
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour faire une offre.",
        variant: "destructive",
      });
      return;
    }

    if (user?.id === listing.userId) {
      toast({
        title: "Action non autorisée",
        description: "Vous ne pouvez pas faire une offre sur votre propre annonce.",
        variant: "destructive",
      });
      return;
    }

    createOfferMutation.mutate(data);
  };

  const onSubmitResponse = (data: NegotiationResponseFormData) => {
    if (!responseNegotiationId) return;
    respondNegotiationMutation.mutate({ id: responseNegotiationId, data });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "accepted":
        return <Badge variant="outline" className="text-green-600 border-green-300"><Check className="w-3 h-3 mr-1" />Acceptée</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-300"><X className="w-3 h-3 mr-1" />Refusée</Badge>;
      case "countered":
        return <Badge variant="outline" className="text-blue-600 border-blue-300"><RefreshCw className="w-3 h-3 mr-1" />Contre-offre</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (price: string | number) => {
    return `${Number(price).toLocaleString()} TND`;
  };

  const isOwner = user && listing.userId === user.id;
  const hasPendingOffer = negotiations.some(n => n.buyerId === user?.id && n.status === "pending");

  // Calculer les prix suggérés
  const originalPrice = parseFloat(listing.price?.toString() || "0");
  const suggestedPrices = originalPrice > 0 ? [
    Math.round(originalPrice * 0.85), // 15% discount
    Math.round(originalPrice * 0.80), // 20% discount
    Math.round(originalPrice * 0.75), // 25% discount
  ] : [];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Bouton pour faire une offre - seulement pour les non-propriétaires */}
      {!isOwner && (
        <Dialog open={isOfferModalOpen} onOpenChange={setIsOfferModalOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full" 
              variant="outline" 
              disabled={hasPendingOffer}
              data-testid="price-negotiation-button"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {hasPendingOffer ? "Offre en attente" : "Faire une offre"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" data-testid="price-negotiation-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Faire une offre de prix
              </DialogTitle>
              <DialogDescription>
                Prix demandé : {formatPrice(listing.price)}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...offerForm}>
              <form onSubmit={offerForm.handleSubmit(onSubmitOffer)} className="space-y-6">
                {/* Suggestions de prix */}
                {suggestedPrices.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Suggestions de prix</label>
                    <div className="grid grid-cols-3 gap-2">
                      {suggestedPrices.map((price, index) => {
                        const discount = [15, 20, 25][index];
                        return (
                          <Button
                            key={price}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => offerForm.setValue("offeredPrice", price.toString())}
                            className="h-12 flex flex-col"
                            data-testid={`suggested-price-${discount}`}
                          >
                            <span className="font-semibold">{price} TND</span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              -{discount}%
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <FormField
                  control={offerForm.control}
                  name="offeredPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Votre offre (TND)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            type="number"
                            placeholder={`Ex: ${suggestedPrices[0] || Math.round(originalPrice * 0.9)}`}
                            className="pl-10"
                            data-testid="price-offer-input"
                            {...field}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                            TND
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={offerForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        Message (optionnel)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Expliquez votre offre, posez des questions..."
                          rows={3}
                          data-testid="negotiation-message"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Résumé de l'offre */}
                {offerForm.watch("offeredPrice") && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Résumé de votre offre</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Prix original:</span>
                        <span className="font-medium">{formatPrice(originalPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Votre offre:</span>
                        <span className="font-medium">{formatPrice(offerForm.watch("offeredPrice"))}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-blue-700">Économie:</span>
                        <span className="font-medium text-green-600">
                          {formatPrice(originalPrice - parseFloat(offerForm.watch("offeredPrice") || "0"))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsOfferModalOpen(false)}
                    data-testid="cancel-negotiation"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createOfferMutation.isPending}
                    data-testid="send-price-offer"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {createOfferMutation.isPending ? "Envoi..." : "Envoyer l'offre"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Liste des négociations */}
      {negotiations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Négociations de prix ({negotiations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {negotiations.map((negotiation) => (
              <div key={negotiation.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Offre : {formatPrice(negotiation.offeredPrice)}
                      </span>
                      {getStatusBadge(negotiation.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Prix original : {formatPrice(negotiation.originalPrice)}
                    </p>
                    {negotiation.counterPrice && (
                      <p className="text-sm font-medium text-blue-600">
                        Contre-offre : {formatPrice(negotiation.counterPrice)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(negotiation.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {negotiation.buyerMessage && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-700">{negotiation.buyerMessage}</p>
                  </div>
                )}

                {negotiation.sellerMessage && (
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-blue-700">{negotiation.sellerMessage}</p>
                  </div>
                )}

                {/* Actions pour le vendeur */}
                {isOwner && negotiation.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setResponseNegotiationId(negotiation.id);
                        respondNegotiationMutation.mutate({
                          id: negotiation.id,
                          data: { status: "accepted" }
                        });
                      }}
                      disabled={respondNegotiationMutation.isPending}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setResponseNegotiationId(negotiation.id);
                        respondNegotiationMutation.mutate({
                          id: negotiation.id,
                          data: { status: "rejected" }
                        });
                      }}
                      disabled={respondNegotiationMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Refuser
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="secondary">
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Contre-offre
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Faire une contre-offre</DialogTitle>
                          <DialogDescription>
                            Offre reçue : {formatPrice(negotiation.offeredPrice)}
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...responseForm}>
                          <form onSubmit={responseForm.handleSubmit((data) => {
                            responseForm.setValue("status", "countered");
                            onSubmitResponse({ ...data, status: "countered" });
                          })} className="space-y-4">
                            <FormField
                              control={responseForm.control}
                              name="counterPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Votre contre-offre (TND)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder={`Ex: ${(Number(negotiation.offeredPrice) + Number(negotiation.originalPrice)) / 2}`}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={responseForm.control}
                              name="sellerMessage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Message (optionnel)</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Expliquez votre contre-offre..."
                                      rows={3}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-2 justify-end">
                              <Button type="submit" disabled={respondNegotiationMutation.isPending}>
                                {respondNegotiationMutation.isPending ? "Envoi..." : "Envoyer contre-offre"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}