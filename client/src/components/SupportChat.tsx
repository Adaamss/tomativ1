import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Bot, User, CheckCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { SupportTicket, SupportMessage } from "@shared/schema";

interface SupportChatProps {
  onClose?: () => void;
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
      return await apiRequest('POST', '/api/support/tickets', {
        subject: 'Chat avec Chattomati',
        category: 'general',
        priority: 'medium',
        userEmail: (user as any)?.email || 'anonymous@tomati.com',
        userName: user ? `${(user as any).firstName} ${(user as any).lastName}` : 'Utilisateur Anonyme'
      }) as SupportTicket;
    },
    onSuccess: (ticket: SupportTicket) => {
      setCurrentTicket(ticket);
      setIsInitialized(true);
    }
  });

  // Get messages for current ticket
  const { data: messages = [], refetch: refetchMessages } = useQuery<SupportMessage[]>({
    queryKey: ['/api/support/tickets', currentTicket?.id, 'messages'],
    enabled: !!currentTicket?.id,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentTicket) throw new Error('No ticket');
      return await apiRequest('POST', `/api/support/tickets/${currentTicket.id}/messages`, {
        content,
        senderType: 'user'
      });
    },
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
      // Scroll to bottom after sending message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  });

  // Initialize chat on component mount
  useEffect(() => {
    if (!isInitialized) {
      createTicketMutation.mutate();
    }
  }, [isInitialized]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string | Date | null) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'bot':
        return <Bot className="w-6 h-6 text-blue-600" />;
      case 'agent':
        return <MessageCircle className="w-6 h-6 text-green-600" />;
      default:
        return <User className="w-6 h-6 text-gray-600" />;
    }
  };

  const getSenderName = (senderType: string) => {
    switch (senderType) {
      case 'bot':
        return 'Chattomati';
      case 'agent':
        return 'Agent Support';
      default:
        return user ? `${(user as any).firstName} ${(user as any).lastName}` : 'Vous';
    }
  };

  const quickActions = [
    {
      icon: "💬",
      text: "J'ai une question sur une annonce",
      message: "Bonjour, j'ai une question concernant une annonce sur votre site. Pouvez-vous m'aider ?"
    },
    {
      icon: "🔧",
      text: "J'ai un problème technique",
      message: "Je rencontre un problème technique sur le site. Pouvez-vous m'assister ?"
    },
    {
      icon: "📞",
      text: "Demander un appel",
      message: "J'aimerais être contacté par téléphone. Pouvez-vous organiser un appel ?"
    },
    {
      icon: "💰",
      text: "Question sur les prix",
      message: "J'ai une question concernant les prix ou la facturation."
    }
  ];

  if (createTicketMutation.isPending) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Connexion à Chattomati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Chattomati</h3>
            <div className="flex items-center text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              En ligne
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Ticket #{currentTicket?.id?.slice(-8)}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index: number) => {
          const isUser = message.senderType === 'user';
          const isBot = message.senderType === 'bot';
          
          return (
            <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
                <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                  {!isUser && (
                    <div className="mr-2 mb-1">
                      {getSenderIcon(message.senderType)}
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : isBot
                        ? 'bg-white text-gray-900 border border-gray-200'
                        : 'bg-green-100 text-gray-900'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {getSenderName(message.senderType)}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {isUser && (
                      <div className="text-xs text-blue-200 mt-1 text-right">
                        {formatMessageTime(message.createdAt)}
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div className="ml-2 mb-1">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {sendMessageMutation.isPending && (
          <div className="flex justify-end">
            <div className="bg-blue-600 text-white rounded-lg px-3 py-2 max-w-[80%]">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-200 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-200 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-200 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-xs ml-2">Envoi...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {Array.isArray(messages) && messages.length <= 1 && (
        <div className="px-4 py-2 border-t bg-white">
          <p className="text-sm text-gray-600 mb-3">Actions rapides :</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <Button 
                key={index}
                variant="outline" 
                size="sm"
                className="text-left justify-start h-auto py-2 px-3"
                onClick={() => {
                  if (!sendMessageMutation.isPending) {
                    sendMessageMutation.mutate(action.message);
                  }
                }}
                disabled={sendMessageMutation.isPending}
              >
                <span className="mr-2">{action.icon}</span>
                <span className="text-xs">{action.text}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tapez votre message..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Appuyez sur Entrée pour envoyer • Support 24/7 disponible
        </p>
      </div>
    </div>
  );
}