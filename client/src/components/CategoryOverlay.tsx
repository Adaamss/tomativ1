import { 
  Car, 
  Home, 
  Briefcase, 
  Package 
} from "lucide-react";
import { useLocation } from "wouter";

interface CategoryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryOverlay({ isOpen, onClose }: CategoryOverlayProps) {
  const [, navigate] = useLocation();

  const categories = [
    { 
      slug: "voiture", 
      name: "Voiture", 
      icon: Car, 
      color: "blue",
      testId: "category-voiture"
    },
    { 
      slug: "immobilier", 
      name: "Immobilier", 
      icon: Home, 
      color: "green",
      testId: "category-immobilier"
    },
    { 
      slug: "emploi", 
      name: "Emploi", 
      icon: Briefcase, 
      color: "purple",
      testId: "category-emploi"
    },
    { 
      slug: "autre", 
      name: "Autre", 
      icon: Package, 
      color: "orange",
      testId: "category-autre"
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return { bg: "bg-blue-100", icon: "text-blue-600" };
      case "green":
        return { bg: "bg-green-100", icon: "text-green-600" };
      case "purple":
        return { bg: "bg-purple-100", icon: "text-purple-600" };
      case "orange":
        return { bg: "bg-orange-100", icon: "text-orange-600" };
      default:
        return { bg: "bg-gray-100", icon: "text-gray-600" };
    }
  };

  const handleCategorySelect = (categorySlug: string) => {
    onClose();
    if (categorySlug === "voiture") {
      navigate("/create-listing?category=voiture");
    } else {
      // For now, redirect to create listing with the category
      navigate(`/create-listing?category=${categorySlug}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"
      onClick={onClose}
      data-testid="category-overlay"
    >
      <div 
        className="bg-white rounded-t-2xl w-full max-w-md p-6 transform transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-8 h-1 bg-secondary rounded-full mx-auto mb-6"></div>
        
        <div className="space-y-4">
          {categories.map((category) => {
            const Icon = category.icon;
            const colors = getColorClasses(category.color);
            
            return (
              <button
                key={category.slug}
                onClick={() => handleCategorySelect(category.slug)}
                className="flex items-center space-x-4 w-full p-4 hover:bg-secondary rounded-lg transition-colors"
                data-testid={category.testId}
              >
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <span className="text-lg font-medium text-foreground">
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
