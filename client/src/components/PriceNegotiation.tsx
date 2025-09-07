import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Listing {
  id: string;
  userId: string;
  price: number;
}

interface Negotiation {
  id: string;
  offeredPrice: string;
  status: string | null;
  counterPrice: string | null;
  sellerMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  listingId: string;
  buyerId: string;
  sellerId: string;
  messageId: string | null;
  originalPrice: string | null;
}

interface PriceNegotiationProps {
  listing?: Listing | null;
}

export default function PriceNegotiation({ listing }: PriceNegotiationProps) {
  const { user } = useAuth();

  // Si pas encore de listing → on n’affiche rien
  if (!listing) return null;

  const isOwner = user && listing?.userId === user.id;
  const originalPrice = parseFloat(listing?.price?.toString() || "0");

  // Récupération des négociations
  const negotiationsQuery = useQuery<Negotiation[]>({
    queryKey: ["/api/negotiations/listing", listing?.id],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/negotiations/listing/${listing?.id}`,
      );
      return res.json();
    },
    enabled: !!listing?.id && !!user,
  });

  // Création d’une nouvelle négociation (acheteur)
  const createNegotiationMutation = useMutation({
    mutationFn: async (data: { offeredPrice: number; message?: string }) => {
      const res = await apiRequest("POST", "/api/negotiations", {
        ...data,
        listingId: listing?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/negotiations/listing", listing?.id],
      });
    },
  });

  // Répondre à une négociation (vendeur)
  const respondNegotiationMutation = useMutation({
    mutationFn: async (data: {
      negotiationId: string;
      counterPrice?: number;
      sellerMessage?: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/negotiations/${data.negotiationId}/respond`,
        data,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/negotiations/listing", listing?.id],
      });
    },
  });

  // Formulaire acheteur
  const negotiationForm = useForm<{ offeredPrice: number; message?: string }>({
    defaultValues: { offeredPrice: 0, message: "" },
  });

  // Formulaire vendeur
  const responseForm = useForm<{
    counterPrice?: number;
    sellerMessage?: string;
  }>({
    defaultValues: { counterPrice: undefined, sellerMessage: "" },
  });

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold mb-2">Négociation de prix</h2>

      {/* Acheteur */}
      {!isOwner && (
        <Dialog>
          <DialogTrigger asChild>
            <Button>Proposer un prix</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proposer un prix</DialogTitle>
            </DialogHeader>
            <Form {...negotiationForm}>
              <form
                onSubmit={negotiationForm.handleSubmit((data) =>
                  createNegotiationMutation.mutate(data),
                )}
                className="space-y-4"
              >
                <FormField
                  control={negotiationForm.control}
                  name="offeredPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix proposé (TND)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={`Ex: ${originalPrice * 0.9}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={negotiationForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Expliquez votre offre..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="submit"
                    disabled={createNegotiationMutation.isPending}
                  >
                    {createNegotiationMutation.isPending
                      ? "Envoi..."
                      : "Envoyer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Liste des négociations */}
      {negotiationsQuery.data && negotiationsQuery.data.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <h3 className="text-md font-semibold">
              Historique des négociations
            </h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {negotiationsQuery.data.map((negotiation: Negotiation) => (
              <div
                key={negotiation.id}
                className="border p-2 rounded space-y-1"
              >
                <div>
                  <span className="font-semibold">Offre :</span>{" "}
                  {negotiation.offeredPrice} TND
                </div>
                {negotiation.counterPrice && (
                  <div>
                    <span className="font-semibold">Contre-offre :</span>{" "}
                    {negotiation.counterPrice} TND
                  </div>
                )}
                {negotiation.sellerMessage && (
                  <div>
                    <span className="font-semibold">Message vendeur :</span>{" "}
                    {negotiation.sellerMessage}
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {negotiation.createdAt &&
                    formatDistanceToNow(new Date(negotiation.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                </div>

                {/* Réponse vendeur */}
                {isOwner && !negotiation.counterPrice && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        Répondre
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Répondre à l'offre</DialogTitle>
                      </DialogHeader>
                      <Form {...responseForm}>
                        <form
                          onSubmit={responseForm.handleSubmit((data) =>
                            respondNegotiationMutation.mutate({
                              ...data,
                              negotiationId: negotiation.id,
                            }),
                          )}
                          className="space-y-4"
                        >
                          <FormField
                            control={responseForm.control}
                            name="counterPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Votre contre-offre (TND)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder={`Ex: ${
                                      (Number(negotiation.offeredPrice) +
                                        Number(
                                          negotiation.originalPrice ?? 0,
                                        )) /
                                      2
                                    }`}
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
                            <Button
                              type="submit"
                              disabled={respondNegotiationMutation.isPending}
                            >
                              {respondNegotiationMutation.isPending
                                ? "Envoi..."
                                : "Envoyer"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
