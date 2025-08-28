import { useLocation } from "wouter";
import { Home, MapPin, MessageCircle, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CategoryOverlay from "./CategoryOverlay";
import { useState } from "react";

export default function BottomNavigation() {
  const [location, navigate] = useLocation();
  const [showCategoryOverlay, setShowCategoryOverlay] = useState(false);

  const navItems = [
    { path: "/", label: "Accueil", icon: Home, testId: "nav-home" },
    { path: "/map", label: "Carte", icon: MapPin, testId: "nav-map" },
    { path: "/messages", label: "Messages", icon: MessageCircle, testId: "nav-messages" },
    { path: "/profile", label: "Profil", icon: User, testId: "nav-profile" },
  ];

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location === "/" || location === "/home";
    }
    return location.startsWith(path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40 lg:hidden" data-testid="bottom-navigation">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = isActivePath(item.path);
            const Icon = item.icon;
            
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={`nav-item flex flex-col items-center py-2 px-4 ${
                  isActive ? "active" : ""
                }`}
                onClick={() => navigate(item.path)}
                data-testid={item.testId}
              >
                <Icon className={`w-6 h-6 mb-1 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`} />
                <span className={`text-xs ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button */}
      <Button
        style={{ backgroundColor: '#f14247' }}
        className="fixed bottom-20 right-4 w-14 h-14 text-white rounded-full shadow-lg hover:shadow-xl hover:opacity-90 z-30 lg:hidden"
        onClick={() => setShowCategoryOverlay(true)}
        data-testid="fab-create"
      >
        <Plus className="w-6 h-6" />
      </Button>

      <CategoryOverlay 
        isOpen={showCategoryOverlay} 
        onClose={() => setShowCategoryOverlay(false)} 
      />
    </>
  );
}
