import { Button } from "@/components/ui/button";
import { Menu, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import tomatiLogo from "@assets/497601036_122096320736877515_5702241569772347584_n_1755873871709-DyNZ1W_Y_1756365033779.jpg";

export default function Header() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation('/');
    },
  });

  return (
    <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
          <img 
            src={tomatiLogo} 
            alt="Tomati Logo" 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-title">
            Tomati
          </h1>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon" data-testid="button-menu">
          <Menu className="w-6 h-6 text-muted-foreground" />
        </Button>
        {isAuthenticated ? (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => logoutMutation.mutate()}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-account"
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? "..." : "Déconnexion"}
          </Button>
        ) : (
          <Button 
            onClick={() => {
              setLocation('/login');
            }}
            size="sm"
            className="bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600"
            data-testid="button-login"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Connexion
          </Button>
        )}
      </div>
    </header>
  );
}
