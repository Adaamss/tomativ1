import { 
  Car, 
  Building2, 
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
      icon: Building2, 
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
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Popup Menu */}
      <div 
        className="fixed bottom-36 right-4 z-50 bg-white rounded-2xl shadow-xl border border-border overflow-hidden min-w-[200px]"
        data-testid="category-overlay"
      >
        <div className="py-2">
          {categories.map((category, index) => {
            const Icon = category.icon;
            const colors = getColorClasses(category.color);
            
            return (
              <button
                key={category.slug}
                onClick={() => handleCategorySelect(category.slug)}
                className={`flex items-center space-x-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                  index < categories.length - 1 ? '' : ''
                }`}
                data-testid={category.testId}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <span className="text-base font-medium text-gray-700">
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
