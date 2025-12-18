import React from 'react';
import * as LucideIcons from 'lucide-react';

// Lista curada de nombres de iconos útiles para finanzas
const AVAILABLE_ICONS = [
  // Básicos
  'Wallet', 'Banknote', 'CreditCard', 'DollarSign', 'Coins', 'PiggyBank', 'Safe',
  // Categorías Comunes
  'Utensils', 'Coffee', 'Beer', 'Pizza', 'ShoppingBag', 'ShoppingCart', 'Shirt', 'Watch',
  'Bus', 'Car', 'Fuel', 'Plane', 'Train', 'Bike', 'Map',
  'Home', 'Bed', 'Bath', 'Sofa', 'Zap', 'Droplet', 'Wifi', 'Phone',
  'Stethoscope', 'Pill', 'Activity', 'Heart', 'Baby', 'Dog', 'Cat',
  'GraduationCap', 'Book', 'Pencil', 'Briefcase', 'Laptop', 'Monitor', 'Printer',
  'Film', 'Music', 'Gamepad', 'Ticket', 'Camera', 'Headphones', 'Tv',
  'Gift', 'PartyPopper', 'Cake', 'Flower', 'Palmtree', 'Umbrella',
  'Hammer', 'Wrench', 'Scissors', 'Trash2', 'Shield', 'Lock', 'Key'
];

interface IconSelectorProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
}

export const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelect }) => {
  return (
    <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-600 rounded-lg bg-slate-900">
      {AVAILABLE_ICONS.map((iconName) => {
        // Obtenemos el componente dinámicamente
        const IconComponent = (LucideIcons as any)[iconName];
        if (!IconComponent) return null;

        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onSelect(iconName)}
            className={`p-2 rounded hover:bg-slate-700 flex justify-center items-center transition-all ${
              selectedIcon === iconName ? 'bg-primary-600 text-white ring-2 ring-primary-400' : 'text-slate-400'
            }`}
            title={iconName}
          >
            <IconComponent size={20} />
          </button>
        );
      })}
    </div>
  );
};