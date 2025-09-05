import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Calendar, User, Car, Check, CheckCheck } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import AppointmentCalendar from "./AppointmentCalendar";
import PriceNegotiation from "./PriceNegotiation";
import { apiRequest } from "@/lib/queryClient";
import type { Listing, Message } from "@shared/schema";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  sellerId: string;
}

export default function ChatModal({
  isOpen,
  onClose,
  listing,
  sellerId,
}: ChatModalProps) {
  const [messageInput, setMessageInput] = useState("");
  const [showAppointmentCalendar, setShowAppointmentCalendar] = useState(false);
  const [showPriceNegotiation, setShowPriceNegotiation] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const { user } = useAuth();
  const { sendMessage, messages, isConnected } = useWebSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch chat history
  const { data: chatHistory = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", sellerId, listing?.id],
    enabled: isOpen && !!sellerId,
  });

  // Combine chat history with new WebSocket messages
  const allMessages = [...chatHistory, ...messages].sort(
    (a, b) =>
      new Date(a.createdAt || 0).getTime() -
      new Date(b.createdAt || 0).getTime(),
  );

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  const handleSendMessage = () => {
    if (messageInput.trim() && sellerId) {
      sendMessage(sellerId, messageInput.trim(), listing?.id);
      setMessageInput("");
      
      // Jouer un son de notification
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore l'erreur si le son ne peut pas être joué
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mutation for creating appointments
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      return await apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messages", sellerId, listing?.id],
      });
    },
  });

  // Mutation for creating price negotiations
  const createNegotiationMutation = useMutation({
    mutationFn: async (negotiationData: any) => {
      return await apiRequest("POST", "/api/negotiations", negotiationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messages", sellerId, listing?.id],
      });
    },
  });

  const handleScheduleAppointment = async (appointmentData: {
    date: Date;
    time: string;
    duration: number;
    location: string;
    notes: string;
  }) => {
    if (!listing || !user) return;

    try {
      await createAppointmentMutation.mutateAsync({
        listingId: listing.id,
        sellerId,
        appointmentDate: appointmentData.date,
        duration: appointmentData.duration,
        location: appointmentData.location,
        notes: appointmentData.notes,
      });

      // Send message about appointment request
      const message = `📅 Demande de rendez-vous:\n📍 ${appointmentData.location}\n🕐 ${appointmentData.date.toLocaleDateString("fr-FR")} à ${appointmentData.time}\n⏱ ${appointmentData.duration} minutes\n${appointmentData.notes ? `\n📝 ${appointmentData.notes}` : ""}`;
      sendMessage(sellerId, message, listing.id);
    } catch (error) {
      console.error("Error creating appointment:", error);
    }
  };

  const handlePriceNegotiation = async (negotiationData: {
    offeredPrice: number;
    message: string;
  }) => {
    if (!listing || !user) return;

    try {
      await createNegotiationMutation.mutateAsync({
        listingId: listing.id,
        sellerId,
        originalPrice: parseFloat(listing.price || "0"),
        offeredPrice: negotiationData.offeredPrice,
        buyerMessage: negotiationData.message,
      });

      // Send message about price negotiation
      const message = `💰 Négociation de prix:\n💵 Prix original: ${listing.price} ${listing.currency}\n🏷 Mon offre: ${negotiationData.offeredPrice} ${listing.currency}\n\n${negotiationData.message}`;
      sendMessage(sellerId, message, listing.id);
    } catch (error) {
      console.error("Error creating negotiation:", error);
    }
  };

  // ✅ Correction : fonctions utilisées dans le rendu
  const handleRendezVous = () => {
    setShowAppointmentCalendar(true);
  };

  const handleNegocierPrix = () => {
    setShowPriceNegotiation(true);
  };

  const formatMessageTime = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: fr,
    });
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
        {/* Header Professionnel */}
        <DialogHeader className="p-4 pb-3 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                  <AvatarImage src="" alt="Vendeur" />
                  <AvatarFallback className="bg-primary text-white font-semibold">
                    <User className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold text-foreground">
                  Vendeur Professionnel
                </DialogTitle>
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className={isConnected ? "text-green-600 font-medium" : "text-gray-500"}>
                    {isConnected ? "En ligne" : `Vu ${lastSeen || "récemment"}`}
                  </span>
                </div>
                {isTyping && (
                  <div className="flex items-center space-x-1 text-xs text-primary">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span>en train d'écrire...</span>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </DialogHeader>

        {/* Product Info Amélioré */}
        {listing && (
          <div className="p-4 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
                <Car className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground text-lg">{listing.title}</h4>
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-xl font-bold text-primary">
                    {listing.price
                      ? `${Number(listing.price).toLocaleString()} TND`
                      : "Gratuit"}
                  </p>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Disponible
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  📍 {listing.location} • ⭐ Vendeur Vérifié
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {allMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="w-12 h-12 mx-auto mb-4 bg-secondary rounded-full flex items-center justify-center">
                <Send className="w-6 h-6 opacity-50" />
              </div>
              <p>Commencez la conversation !</p>
              <p className="text-sm mt-1">
                Envoyez votre premier message au vendeur.
              </p>
            </div>
          ) : (
            allMessages.map((message, index) => (
              <div
                key={message.id || `message-${index}`}
                className={`flex ${message.senderId === (user as any)?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.senderId === (user as any)?.id
                      ? "bg-primary text-white ml-4 rounded-br-md"
                      : "bg-white border border-gray-200 mr-4 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <div className={`flex items-center justify-between mt-2 ${
                    message.senderId === (user as any)?.id ? "text-white/70" : "text-muted-foreground"
                  }`}>
                    <p className="text-xs">
                      {message.createdAt
                        ? formatMessageTime(message.createdAt)
                        : "En cours..."}
                    </p>
                    {message.senderId === (user as any)?.id && (
                      <div className="flex items-center">
                        {message.readAt ? (
                          <CheckCheck className="w-3 h-3 text-blue-300" />
                        ) : (
                          <Check className="w-3 h-3 text-white/50" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Actions Professionnelles */}
        <div className="p-4 border-b border-border bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-center space-x-2 h-12 bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-800"
              onClick={handleRendezVous}
              disabled={!isConnected}
              data-testid="button-rendez-vous"
            >
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Rendez-vous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-center space-x-2 h-12 bg-white hover:bg-green-50 border-green-200 text-green-700 hover:text-green-800"
              onClick={handleNegocierPrix}
              disabled={!isConnected}
              data-testid="button-negocier-prix"
            >
              <span className="text-lg">💰</span>
              <span className="font-medium">Négocier</span>
            </Button>
          </div>
          
          {/* Messages Suggérés */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-3 py-1 h-auto bg-white/50 hover:bg-white border border-gray-200"
              onClick={() => setMessageInput("Bonjour, je suis intéressé par votre annonce.")}
            >
              👋 Saluer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-3 py-1 h-auto bg-white/50 hover:bg-white border border-gray-200"
              onClick={() => setMessageInput("Pouvez-vous me donner plus d'informations ?")}
            >
              ℹ️ Plus d'infos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-3 py-1 h-auto bg-white/50 hover:bg-white border border-gray-200"
              onClick={() => setMessageInput("Est-ce que l'article est toujours disponible ?")}
            >
              ✅ Disponibilité
            </Button>
          </div>
        </div>

        {/* Zone de Saisie Professionnelle */}
        <div className="p-4 bg-white border-t border-border">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <Input
                placeholder="Écrivez votre message professionnel..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="pr-12 h-12 rounded-full border-2 border-gray-200 focus:border-primary bg-gray-50 focus:bg-white transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {messageInput.length}/500
              </div>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || !isConnected}
              size="icon"
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Indicateur de connexion */}
          <div className="flex items-center justify-center mt-2">
            <div className={`flex items-center space-x-2 text-xs ${
              isConnected ? "text-green-600" : "text-red-500"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`} />
              <span className="font-medium">
                {isConnected ? "Connecté • Messages envoyés instantanément" : "Reconnexion en cours..."}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Appointment Calendar Modal */}
      <AppointmentCalendar
        isOpen={showAppointmentCalendar}
        onClose={() => setShowAppointmentCalendar(false)}
        listing={listing}
        sellerId={sellerId}
        onSchedule={handleScheduleAppointment}
      />

      {/* Price Negotiation Modal */}
      <PriceNegotiation
        isOpen={showPriceNegotiation}
        onClose={() => setShowPriceNegotiation(false)}
        listing={listing}
        sellerId={sellerId}
        onNegotiate={handlePriceNegotiation}
      />
    </Dialog>
  );
}
