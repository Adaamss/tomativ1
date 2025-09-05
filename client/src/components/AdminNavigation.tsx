import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  AlertCircle, 
  Home,
  Shield
} from "lucide-react";

export default function AdminNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return null;
  }

  const navItems = [
    {
      path: "/admin/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      testId: "nav-dashboard"
    },
    {
      path: "/admin/users",
      icon: Users,
      label: "Utilisateurs",
      testId: "nav-users"
    },
    {
      path: "/admin/listings",
      icon: Package,
      label: "Annonces",
      testId: "nav-listings"
    },
    {
      path: "/admin/ad-requests",
      icon: AlertCircle,
      label: "Demandes Pub",
      testId: "nav-ad-requests"
    }
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-lg">Panneau d'Administration</h2>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/'}
            data-testid="button-back-home"
          >
            <Home className="h-4 w-4 mr-1" />
            Retour à l'accueil
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-2"
                  data-testid={item.testId}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}