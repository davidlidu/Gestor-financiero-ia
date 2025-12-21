import React from 'react';
import * as LucideIcons from 'lucide-react';

// Lista curada de nombres de iconos útiles para finanzas
const AVAILABLE_ICONS = [
  // --- Dinero e Inversiones ---
  'Wallet', 'Banknote', 'CreditCard', 'DollarSign', 'Coins', 'PiggyBank', 'Safe', 
  'Landmark', 'TrendingUp', 'Bitcoin', 'Receipt', 'Gavel', // Nuevos: Banco, Inversión, Cripto, Factura, Legal
  
  // --- Alimentación y Mercado ---
  'Utensils', 'Coffee', 'Beer', 'Pizza', 'ShoppingBag', 'ShoppingCart', 
  'Apple', 'Wine', 'Sandwich', // Nuevos: Mercado saludable, Licores, Lunch
  
  // --- Compras y Personal ---
  'Shirt', 'Watch', 'Gift', 'Scissors', 'Smile', 'Dumbbell', // Nuevos: Bienestar, Gym
  
  // --- Transporte ---
  'Bus', 'Car', 'Fuel', 'Plane', 'Train', 'Bike', 'Map', 
  'ParkingCircle', 'Anchor', // Nuevos: Parqueadero, Viajes marinos
  
  // --- Hogar y Servicios ---
  'Home', 'Bed', 'Bath', 'Sofa', 'Zap', 'Droplet', 'Wifi', 'Phone', 'Smartphone', 
  'Lightbulb', 'Hammer', 'Wrench', 'Trash2', 'WashingMachine', // Nuevos: Celular, Luz, Lavandería
  
  // --- Salud y Familia ---
  'Stethoscope', 'Pill', 'Activity', 'Heart', 'Baby', 'Dog', 'Cat', 
  
  // --- Educación y Trabajo ---
  'GraduationCap', 'Book', 'Pencil', 'Briefcase', 'Laptop', 'Monitor', 'Printer', 
  'FileText', // Nuevo: Documentos/Trámites
  
  // --- Entretenimiento y Tech ---
  'Film', 'Music', 'Gamepad', 'Ticket', 'Camera', 'Headphones', 'Tv', 
  
  // --- Ocio y Varios ---
  'PartyPopper', 'Cake', 'Flower', 'Palmtree', 'Umbrella', 
  'Shield', 'Lock', 'Key', 'AlertTriangle' // Nuevo: Emergencias
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