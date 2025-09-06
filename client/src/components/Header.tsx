import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, LogIn, Home, MapPin, MessageCircle, User, Search, ChevronDown, HelpCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SupportChat } from "@/components/SupportChat";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useCallback } from "react";
import tomatiLogo from "@assets/tomati-logo.png";

interface HeaderProps {
  onSearch?: (query: string, city: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("tunis");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSupportChat, setShowSupportChat] = useState(false);

  const handleSearch = useCallback(() => {
    if (onSearch) {
      onSearch(searchQuery, selectedCity);
    }
  }, [onSearch, searchQuery, selectedCity]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

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
        <div className="px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
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
            
            <button 
              onClick={() => setLocation('/')}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
              data-testid="logo-home-link"
            >
              <img 
                src={tomatiLogo} 
                alt="Tomati" 
                className="h-10 md:h-16 w-auto object-contain"
              />
            </button>
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
        <div className="w-full py-2 md:py-3 bg-gray-50 border-t border-gray-200">
          <div className="w-full px-3 md:px-4">
            <div className="flex items-center space-x-2 md:space-x-3 w-full">
              {/* Sélecteur de ville */}
              <div className="flex-shrink-0">
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="w-32 md:w-48 bg-white text-sm md:text-base" data-testid="city-selector">
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-gray-500" />
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
                <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-8 md:pl-10 bg-white w-full text-sm md:text-base"
                  data-testid="search-input"
                />
              </div>

              {/* Bouton de recherche */}
              <Button 
                variant="outline" 
                size="sm"
                className="px-3 flex-shrink-0"
                onClick={handleSearch}
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
            
            {/* Contacter Chattomati - Always visible */}
            <button
              onClick={() => {
                setShowSupportChat(true);
                setIsMenuOpen(false);
              }}
              className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              data-testid="menu-support"
            >
              <HelpCircle className="w-5 h-5 mr-3 text-gray-600" />
              <span className="text-gray-900">Contacter Chattomati</span>
            </button>
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

      {/* Support Chat Modal */}
      <Dialog open={showSupportChat} onOpenChange={setShowSupportChat}>
        <DialogContent className="max-w-md p-0 gap-0">
          <SupportChat onClose={() => setShowSupportChat(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
