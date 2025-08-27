import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Calendar, User, Car } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Listing, Message } from "@shared/schema";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  sellerId: string;
}

export default function ChatModal({ isOpen, onClose, listing, sellerId }: ChatModalProps) {
  const [messageInput, setMessageInput] = useState("");
  const { user } = useAuth();
  const { sendMessage, messages, isConnected } = useWebSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat history
  const { data: chatHistory = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages', sellerId, listing?.id],
    enabled: isOpen && !!sellerId,
  });

  // Combine chat history with new WebSocket messages
  const allMessages = [...chatHistory, ...messages].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  const handleSendMessage = () => {
    if (messageInput.trim() && sellerId) {
      sendMessage(sellerId, messageInput.trim(), listing?.id);
      setMessageInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRendezVous = () => {
    if (sellerId && listing) {
      const message = `Bonjour ! Je suis intéressé(e) par "${listing.title}". Pourriez-vous m'organiser un rendez-vous pour voir l'article ? Merci !`;
      sendMessage(sellerId, message, listing.id);
    }
  };

  const handleNegocierPrix = () => {
    if (sellerId && listing) {
      const message = `Bonjour ! Je suis intéressé(e) par "${listing.title}". Seriez-vous ouvert(e) à négocier le prix ? Merci !`;
      sendMessage(sellerId, message, listing.id);
    }
  };

  const formatMessageTime = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { 
      addSuffix: true, 
      locale: fr 
    });
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src="" alt="Vendeur" />
              <AvatarFallback className="bg-primary text-white">
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg text-foreground">
                Conversation avec le vendeur
              </DialogTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{isConnected ? 'En ligne' : 'Hors ligne'}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Product Info */}
        {listing && (
          <div className="p-4 border-b border-border bg-secondary/20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">{listing.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {listing.price ? `${Number(listing.price).toLocaleString()} TND` : 'Gratuit'}
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
              <p className="text-sm mt-1">Envoyez votre premier message au vendeur.</p>
            </div>
          ) : (
            allMessages.map((message, index) => (
              <div
                key={message.id || `message-${index}`}
                className={`flex ${message.senderId === (user as any)?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg p-3 ${
                    message.senderId === (user as any)?.id
                      ? 'bg-primary text-white ml-4'
                      : 'bg-secondary mr-4'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.senderId === (user as any)?.id
                        ? 'text-white/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {message.createdAt ? formatMessageTime(message.createdAt) : 'En cours...'}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="p-3 border-b border-border">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 text-xs"
              onClick={handleRendezVous}
              disabled={!isConnected}
              data-testid="button-rendez-vous"
            >
              <Calendar className="w-4 h-4 mr-1" />
              Rendez-vous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 text-xs"
              onClick={handleNegocierPrix}
              disabled={!isConnected}
              data-testid="button-negocier-prix"
            >
              Négocier le prix
            </Button>
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex space-x-2">
            <Input
              placeholder="Tapez votre message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || !isConnected}
              size="icon"
              className="bg-primary hover:bg-red-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}