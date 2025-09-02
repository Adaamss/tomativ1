import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, LogIn, Home, MapPin, MessageCircle, User, Search, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import tomatiLogo from "@assets/497601036_122096320736877515_5702241569772347584_n_1755873871709-DyNZ1W_Y_1756365033779.jpg";

export default function Header() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("tunis");
  const [searchQuery, setSearchQuery] = useState("");

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
    <>
      <header className="bg-white border-b border-border fixed top-0 left-0 right-0 z-50">
        {/* Header principal */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Menu Hamburger près du logo */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
              data-testid="button-menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </Button>
            
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
                style={{ backgroundColor: '#f14247' }}
                className="hover:opacity-90 transition-opacity"
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Connexion
              </Button>
            )}
          </div>
        </div>

        {/* Section localisation et recherche - Full Width */}
        <div className="w-full py-3 bg-gray-50 border-t border-gray-200">
          <div className="w-full px-4">
            <div className="flex items-center space-x-3 w-full">
              {/* Sélecteur de ville */}
              <div className="flex-shrink-0">
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="w-48 bg-white" data-testid="city-selector">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tunis">Tunis</SelectItem>
                    <SelectItem value="sfax">Sfax</SelectItem>
                    <SelectItem value="sousse">Sousse</SelectItem>
                    <SelectItem value="gabes">Gabès</SelectItem>
                    <SelectItem value="bizerte">Bizerte</SelectItem>
                    <SelectItem value="ariana">Ariana</SelectItem>
                    <SelectItem value="gafsa">Gafsa</SelectItem>
                    <SelectItem value="monastir">Monastir</SelectItem>
                    <SelectItem value="ben-arous">Ben Arous</SelectItem>
                    <SelectItem value="kasserine">Kasserine</SelectItem>
                    <SelectItem value="medenine">Médenine</SelectItem>
                    <SelectItem value="nabeul">Nabeul</SelectItem>
                    <SelectItem value="tataouine">Tataouine</SelectItem>
                    <SelectItem value="beja">Béja</SelectItem>
                    <SelectItem value="jendouba">Jendouba</SelectItem>
                    <SelectItem value="mahdia">Mahdia</SelectItem>
                    <SelectItem value="mannouba">Manouba</SelectItem>
                    <SelectItem value="kebili">Kébili</SelectItem>
                    <SelectItem value="tozeur">Tozeur</SelectItem>
                    <SelectItem value="zaghouan">Zaghouan</SelectItem>
                    <SelectItem value="siliana">Siliana</SelectItem>
                    <SelectItem value="kairouan">Kairouan</SelectItem>
                    <SelectItem value="sidi-bouzid">Sidi Bouzid</SelectItem>
                    <SelectItem value="kef">Le Kef</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Barre de recherche - Full Width */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Que recherchez-vous ?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white w-full"
                  data-testid="search-input"
                />
              </div>

              {/* Bouton de recherche */}
              <Button 
                variant="outline" 
                size="sm"
                className="px-3 flex-shrink-0"
                data-testid="search-button"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Menu déroulant */}
      {isMenuOpen && (
        <div className="fixed top-32 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40" data-testid="dropdown-menu">
          <div className="py-2">
            <button
              onClick={() => {
                setLocation('/');
                setIsMenuOpen(false);
              }}
              className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              data-testid="menu-home"
            >
              <Home className="w-5 h-5 mr-3 text-gray-600" />
              <span className="text-gray-900">Accueil</span>
            </button>
            
            <button
              onClick={() => {
                setLocation('/map');
                setIsMenuOpen(false);
              }}
              className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              data-testid="menu-map"
            >
              <MapPin className="w-5 h-5 mr-3 text-gray-600" />
              <span className="text-gray-900">Carte</span>
            </button>
            
            {isAuthenticated && (
              <>
                <button
                  onClick={() => {
                    setLocation('/messages');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  data-testid="menu-messages"
                >
                  <MessageCircle className="w-5 h-5 mr-3 text-gray-600" />
                  <span className="text-gray-900">Messages</span>
                </button>
                
                <button
                  onClick={() => {
                    setLocation('/profile');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  data-testid="menu-profile"
                >
                  <User className="w-5 h-5 mr-3 text-gray-600" />
                  <span className="text-gray-900">Profil</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Overlay pour fermer le menu en cliquant en dehors */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30" 
          onClick={() => setIsMenuOpen(false)}
          data-testid="menu-overlay"
        />
      )}
    </>
  );
}
