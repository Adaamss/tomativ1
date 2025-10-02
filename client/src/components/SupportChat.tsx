import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Send, Bot, User, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { SupportTicket, SupportMessage } from "@shared/schema";

interface SupportChatProps {
  onClose: () => void;
}

export function SupportChat({ onClose }: SupportChatProps) {
  const { user } = useAuth();
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Create initial support ticket
  const createTicketMutation = useMutation({
    mutationFn: async (): Promise<SupportTicket> => {
      const response = await apiRequest("POST", "/api/support/tickets", {
        subject: "Chat avec Chattomati",
        category: "general",
        priority: "medium",
        userEmail: (user as any)?.email || "anonymous@tomati.com",
        userName: user
          ? `${(user as any).firstName} ${(user as any).lastName}`
          : "Utilisateur Anonyme",
      });

      console.log("[Ticket] Raw response:", response);
      const ticket: SupportTicket = await response.json(); // ✅ FIX
      console.log("[Ticket] Parsed JSON:", ticket);
      return ticket;
    },
    onSuccess: (ticket: SupportTicket) => {
      console.log("[Ticket] Setting current ticket:", ticket);
      setCurrentTicket(ticket);
      setIsInitialized(true);
    },
    onError: (error) => {
      console.error("[Ticket] Failed to create:", error);
    },
  });

  // Get messages for current ticket
  const { data: messages = [], refetch: refetchMessages } = useQuery<SupportMessage[]>({
    queryKey: ["/api/support/tickets", currentTicket?.id, "messages"],
    queryFn: async () => {
      if (!currentTicket?.id) return [];
      const res = await apiRequest("GET", `/api/support/tickets/${currentTicket.id}/messages`);
      const json = await res.json();
      console.log("[Messages] Refetched:", json);
      return json;
    },
    enabled: !!currentTicket?.id,
    refetchInterval: 3000,
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentTicket?.id) {
        console.error("[Message] No ticket ID available", currentTicket);
        throw new Error("Ticket non disponible");
      }
      console.log("[Message] Sending to ticket:", currentTicket.id, "content:", content);
      const res = await apiRequest(
        "POST",
        `/api/support/tickets/${currentTicket.id}/messages`,
        { content, senderType: "user" }
      );
      const json = await res.json();
      console.log("[Message] Sent, server response:", json);
      return json;
    },
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
  });

  // Initialize chat
  useEffect(() => {
    if (!isInitialized && !createTicketMutation.isPending) {
      console.log("[Init] Creating ticket...");
      createTicketMutation.mutate();
    }
  }, [isInitialized, createTicketMutation.isPending]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    console.log("[UI] Attempting to send message, ticket:", currentTicket);
    if (newMessage.trim() && !sendMessageMutation.isPending && currentTicket?.id) {
      sendMessageMutation.mutate(newMessage.trim());
    } else if (!currentTicket?.id) {
      console.error("[UI] Cannot send: no ticket available", currentTicket);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string | Date | null) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const quickActions = [
    { icon: "💬", text: "J'ai une question sur une annonce", message: "Bonjour, j'ai une question concernant une annonce sur votre site." },
    { icon: "🔧", text: "J'ai un problème technique", message: "Je rencontre un problème technique sur le site. Pouvez-vous m'assister ?" },
    { icon: "📞", text: "Demander un appel", message: "J'aimerais être contacté par téléphone. Pouvez-vous organiser un appel ?" },
    { icon: "💰", text: "Question sur les prix", message: "J'ai une question concernant les prix ou la facturation." },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[90vw] h-[80vh] max-h-[600px] flex flex-col p-0 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-2xl border-0 rounded-xl">
        {createTicketMutation.isPending ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600">Connexion à Chattomati...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="relative p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-semibold text-gray-900">
                      Chattomati
                    </DialogTitle>
                    <div className="flex items-center text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                      En ligne
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-2 right-2">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {currentTicket?.id && (
                <div className="text-xs text-gray-500 mt-2">
                  Ticket #{currentTicket.id.slice(-8)}
                </div>
              )}
            </DialogHeader>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => {
                const isUser = message.senderType === "user";
                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
                      <div className={`flex items-end ${isUser ? "justify-end" : "justify-start"} mb-1`}>
                        {!isUser && <MessageCircle className="w-6 h-6 text-gray-600 mr-2" />}
                        <div className={`rounded-lg px-3 py-2 ${isUser ? "bg-blue-600 text-white" : "bg-white text-gray-900 border"}`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className="text-xs mt-1 text-right">{formatMessageTime(message.createdAt)}</div>
                        </div>
                        {isUser && <User className="w-6 h-6 text-gray-600 ml-2" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t bg-white">
                <p className="text-sm text-gray-600 mb-3">Actions rapides :</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action, index) => (
                    <Button key={index} variant="outline" size="sm"
                      onClick={() => sendMessageMutation.mutate(action.message)}
                      disabled={sendMessageMutation.isPending}>
                      <span className="mr-2">{action.icon}</span>
                      <span className="text-xs">{action.text}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t bg-white rounded-b-xl">
              <div className="flex space-x-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  className="flex-1 h-12"
                  disabled={sendMessageMutation.isPending}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sendMessageMutation.isPending} size="icon">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
