import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import tomatiLogoBlack from "@assets/image_1757188560157.png";

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-800 py-12 mt-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo et description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <img 
                src={tomatiLogoBlack} 
                alt="Tomati" 
                className="w-8 h-8"
              />
              <h3 className="text-xl font-bold">Tomati</h3>
            </div>
            <p className="text-gray-600 text-sm">
              La marketplace tunisienne de référence pour acheter et vendre facilement.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-500 hover:text-gray-800 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-800 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-800 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Catégories */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">Catégories</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-gray-800 transition-colors">Voitures</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Immobilier</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Emploi</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Électronique</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Mode</a></li>
            </ul>
          </div>

          {/* Aide */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">Aide</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-gray-800 transition-colors">Comment ça marche</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Conseils sécurité</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Règles de publication</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Nous contacter</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">Contact</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>contact@tomati.tn</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>+216 XX XXX XXX</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>Tunis, Tunisie</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-300 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
            <p>&copy; 2025 Tomati. Tous droits réservés.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-gray-800 transition-colors">Politique de confidentialité</a>
              <a href="#" className="hover:text-gray-800 transition-colors">Conditions d'utilisation</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}