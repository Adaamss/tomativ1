import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, MessageSquare } from "lucide-react";
import type { Listing } from "@shared/schema";

interface PriceNegotiationProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  sellerId: string;
  onNegotiate: (negotiationData: {
    offeredPrice: number;
    message: string;
  }) => void;
}

export default function PriceNegotiation({
  isOpen,
  onClose,
  listing,
  sellerId,
  onNegotiate
}: PriceNegotiationProps) {
  const [offeredPrice, setOfferedPrice] = useState("");
  const [message, setMessage] = useState("");

  const originalPrice = listing ? parseFloat(listing.price || "0") : 0;
  const offerAmount = parseFloat(offeredPrice) || 0;
  const discountPercentage = originalPrice > 0 ? Math.round(((originalPrice - offerAmount) / originalPrice) * 100) : 0;

  const handleNegotiate = () => {
    if (!offeredPrice || offerAmount <= 0) return;

    onNegotiate({
      offeredPrice: offerAmount,
      message: message || `Je souhaite vous proposer ${offerAmount} ${listing?.currency || 'TND'} pour cet article.`
    });

    // Reset form
    setOfferedPrice("");
    setMessage("");
    onClose();
  };

  const suggestedPrices = originalPrice > 0 ? [
    Math.round(originalPrice * 0.85), // 15% discount
    Math.round(originalPrice * 0.80), // 20% discount
    Math.round(originalPrice * 0.75), // 25% discount
  ] : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="price-negotiation-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg">
            <DollarSign className="w-5 h-5 mr-2 text-primary" />
            Négocier le prix
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Info */}
          {listing && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-1">{listing.title}</h3>
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-gray-900">
                  Prix actuel: {listing.price} {listing.currency}
                </p>
                {offerAmount > 0 && offerAmount < originalPrice && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    -{discountPercentage}%
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Quick Price Suggestions */}
          {suggestedPrices.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Suggestions de prix</Label>
              <div className="grid grid-cols-3 gap-2">
                {suggestedPrices.map((price, index) => {
                  const discount = [15, 20, 25][index];
                  return (
                    <Button
                      key={price}
                      variant="outline"
                      size="sm"
                      onClick={() => setOfferedPrice(price.toString())}
                      className="h-12 flex flex-col"
                      data-testid={`suggested-price-${discount}`}
                    >
                      <span className="font-semibold">{price} {listing?.currency}</span>
                      <span className="text-xs text-gray-500">-{discount}%</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Votre offre</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                placeholder="Montant proposé"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(e.target.value)}
                className="pl-10"
                min="1"
                max={originalPrice}
                data-testid="price-offer-input"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                {listing?.currency}
              </span>
            </div>
            {offerAmount > originalPrice && (
              <p className="text-sm text-amber-600">
                ⚠️ Votre offre est supérieure au prix demandé
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center">
              <MessageSquare className="w-4 h-4 mr-1" />
              Message (optionnel)
            </Label>
            <Textarea
              placeholder="Expliquez votre offre, posez des questions..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              data-testid="negotiation-message"
            />
          </div>

          {/* Price Comparison */}
          {offerAmount > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Résumé de votre offre</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Prix original:</span>
                  <span className="font-medium">{originalPrice} {listing?.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Votre offre:</span>
                  <span className="font-medium">{offerAmount} {listing?.currency}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-blue-700">Économie:</span>
                  <span className="font-medium text-green-600">
                    {originalPrice - offerAmount} {listing?.currency} ({discountPercentage}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              data-testid="cancel-negotiation"
            >
              Annuler
            </Button>
            <Button
              onClick={handleNegotiate}
              disabled={!offeredPrice || offerAmount <= 0}
              className="flex-1"
              style={{ backgroundColor: '#f14247' }}
              data-testid="send-price-offer"
            >
              Envoyer l'offre
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}