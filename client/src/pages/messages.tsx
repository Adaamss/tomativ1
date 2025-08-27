import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { MessageCircle } from "lucide-react";
import type { Conversation } from "@shared/schema";

export default function Messages() {
  const { user } = useAuth();
  
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    retry: false,
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-20">
        <div className="flex h-[calc(100vh-160px)]">
          {/* Messages Sidebar */}
          <div className="w-full md:w-1/3 bg-white border-r border-border">
            <div className="bg-primary text-white p-4">
              <h2 className="text-lg font-semibold" data-testid="text-messages-header">
                Messages ({conversations.length})
              </h2>
            </div>
            
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-secondary rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-secondary rounded animate-pulse" />
                      <div className="h-3 bg-secondary rounded animate-pulse w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2" data-testid="text-no-conversations">
                  Aucune conversation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Contactez un vendeur depuis la carte pour commencer
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conversation) => (
                  <div 
                    key={conversation.id}
                    className="p-4 hover:bg-secondary cursor-pointer transition-colors"
                    data-testid={`conversation-${conversation.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">U</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          Conversation
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          Cliquez pour voir les messages
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(conversation.createdAt!).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Message Content Area */}
          <div className="hidden md:flex flex-1 items-center justify-center bg-secondary">
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MessageCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2" data-testid="text-select-conversation">
                Sélectionnez une conversation
              </h3>
              <p className="text-sm text-muted-foreground">
                Choisissez une conversation pour commencer à discuter
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
