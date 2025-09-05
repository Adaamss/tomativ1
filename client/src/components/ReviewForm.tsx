import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import StarRating from "./StarRating";
import { insertReviewSchema } from "@shared/schema";
import { z } from "zod";
import { MessageSquare, Star } from "lucide-react";

const reviewFormSchema = insertReviewSchema.extend({
  rating: z.number().min(1, "Veuillez donner une note").max(5),
  comment: z.string().min(10, "Votre commentaire doit contenir au moins 10 caractères").max(1000, "Votre commentaire ne peut pas dépasser 1000 caractères")
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
  listingId: string;
  sellerId: string;
  onSuccess?: () => void;
  className?: string;
}

export default function ReviewForm({ listingId, sellerId, onSuccess, className }: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      title: "",
      comment: "",
      isAnonymous: 0,
      listingId,
      sellerId,
      reviewerId: "", // This will be set by the server
      status: "published"
    }
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      return await apiRequest(`/api/listings/${listingId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Évaluation publiée !",
        description: "Merci pour votre commentaire. Il aidera d'autres utilisateurs.",
        variant: "default",
      });
      
      // Invalidate queries to refresh the reviews
      queryClient.invalidateQueries({ queryKey: [`/api/listings/${listingId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sellers/${sellerId}/rating`] });
      
      // Reset form
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de publier votre évaluation. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    try {
      await createReviewMutation.mutateAsync(data);
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={className} data-testid="review-form">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <span>Évaluer ce vendeur</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Rating */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <Star className="h-4 w-4" />
                    <span>Note générale *</span>
                  </FormLabel>
                  <FormControl>
                    <div className="pt-2">
                      <StarRating
                        rating={field.value}
                        onRatingChange={field.onChange}
                        size="lg"
                        showValue={false}
                        data-testid="rating-input"
                      />
                      {field.value > 0 && (
                        <p className="text-sm text-gray-600 mt-2">
                          {field.value === 1 && "Très mauvais"}
                          {field.value === 2 && "Mauvais"}
                          {field.value === 3 && "Correct"}
                          {field.value === 4 && "Bon"}
                          {field.value === 5 && "Excellent"}
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre de votre évaluation (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Résumez votre expérience en quelques mots..."
                      {...field}
                      data-testid="title-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comment */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Votre commentaire *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Partagez votre expérience avec ce vendeur. Comment s'est déroulé l'achat ? Le produit correspondait-il à la description ?"
                      className="min-h-[120px] resize-none"
                      {...field}
                      data-testid="comment-input"
                    />
                  </FormControl>
                  <div className="flex justify-between items-center mt-1">
                    <FormMessage />
                    <span className="text-xs text-gray-500">
                      {field.value?.length || 0}/1000
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Anonymous option */}
            <FormField
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value === 1}
                      onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                      data-testid="anonymous-checkbox"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    Publier cette évaluation de manière anonyme
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Submit button */}
            <div className="flex space-x-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
                data-testid="cancel-review"
              >
                Annuler
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting || form.watch('rating') === 0}
                className="flex-1"
                data-testid="submit-review"
              >
                {isSubmitting ? "Publication..." : "Publier l'évaluation"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}