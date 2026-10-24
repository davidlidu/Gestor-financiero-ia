import React, { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X } from 'lucide-react';

// Iconos destacados para finanzas (se muestran primero cuando no hay búsqueda)
export const AVAILABLE_ICONS = [
  // Dinero e inversiones
  'Wallet', 'Banknote', 'CreditCard', 'DollarSign', 'Coins', 'PiggyBank', 'Landmark', 'TrendingUp', 'TrendingDown',
  'Bitcoin', 'Receipt', 'Percent', 'HandCoins', 'BadgeDollarSign', 'ChartPie', 'Vault',
  // Alimentación
  'ShoppingCart', 'ShoppingBasket', 'Utensils', 'UtensilsCrossed', 'Coffee', 'Pizza', 'Sandwich', 'Beer', 'Wine', 'Apple', 'Croissant', 'IceCreamCone',
  // Hogar y servicios
  'Home', 'Building2', 'Sofa', 'Bed', 'Bath', 'Zap', 'Droplet', 'Flame', 'Wifi', 'Phone', 'Smartphone', 'Tv', 'Lightbulb', 'WashingMachine', 'Hammer', 'Wrench', 'SprayCan',
  // Transporte
  'Car', 'Bus', 'Fuel', 'ParkingCircle', 'Route', 'Bike', 'Plane', 'Train', 'TramFront', 'Ship', 'CarTaxiFront', 'Motorbike',
  // Personal y salud
  'Shirt', 'Footprints', 'Scissors', 'Sparkles', 'Dumbbell', 'HeartPulse', 'Stethoscope', 'Pill', 'Hospital', 'Glasses',
  // Familia y mascotas
  'Baby', 'Users', 'PawPrint', 'Dog', 'Cat', 'Gift', 'Cake', 'HandHeart',
  // Educación y trabajo
  'GraduationCap', 'BookOpen', 'Briefcase', 'Laptop', 'Monitor', 'Printer', 'FileText',
  // Entretenimiento
  'Film', 'Music', 'Gamepad2', 'Ticket', 'Headphones', 'Repeat', 'PartyPopper', 'Palmtree', 'Tent',
  // Seguridad y varios
  'ShieldCheck', 'Umbrella', 'Lock', 'Key', 'AlertTriangle', 'RotateCcw', 'CircleEllipsis', 'Circle',
];

// Búsqueda en español: palabra -> fragmentos de nombres de iconos (en inglés)
const SPANISH: Record<string, string[]> = {
  dinero: ['wallet', 'banknote', 'coins', 'dollar', 'hand-coins', 'piggy'], plata: ['wallet', 'banknote', 'coins'],
  billetera: ['wallet'], efectivo: ['banknote', 'coins'], moneda: ['coins', 'euro', 'dollar'], ahorro: ['piggy', 'vault'],
  banco: ['landmark', 'building', 'vault'], tarjeta: ['credit-card', 'wallet-cards'], credito: ['credit-card', 'landmark'],
  deuda: ['landmark', 'credit-card', 'hand-coins'], prestamo: ['hand-coins', 'landmark'], factura: ['receipt', 'file-text'],
  impuesto: ['receipt', 'percent', 'landmark'], inversion: ['trending', 'chart', 'bitcoin'], cripto: ['bitcoin'],
  porcentaje: ['percent'], grafica: ['chart'], pago: ['credit-card', 'banknote', 'hand-coins'],
  comida: ['utensils', 'pizza', 'sandwich', 'soup', 'salad', 'beef', 'chef-hat'], mercado: ['shopping-cart', 'shopping-basket', 'apple', 'carrot'],
  supermercado: ['shopping-cart', 'shopping-basket'], compra: ['shopping', 'store'], tienda: ['store', 'shopping'],
  restaurante: ['utensils', 'chef-hat'], domicilio: ['bike', 'package', 'truck'], cafe: ['coffee'], cerveza: ['beer'],
  vino: ['wine'], licor: ['wine', 'beer', 'martini'], fruta: ['apple', 'banana', 'cherry', 'citrus', 'grape'],
  pan: ['croissant', 'sandwich', 'wheat'], postre: ['cake', 'ice-cream', 'cookie', 'dessert'], helado: ['ice-cream'],
  casa: ['home', 'house'], hogar: ['home', 'house', 'sofa', 'lamp'], arriendo: ['home', 'house', 'key', 'building'],
  apartamento: ['building', 'house'], mueble: ['sofa', 'armchair', 'bed', 'lamp'], aseo: ['spray-can', 'brush', 'trash', 'washing-machine'],
  lavanderia: ['washing-machine', 'shirt'], luz: ['zap', 'lightbulb', 'plug'], energia: ['zap', 'plug', 'battery'],
  agua: ['droplet', 'glass-water', 'waves'], gas: ['flame'], internet: ['wifi', 'globe', 'router'], celular: ['smartphone', 'phone'],
  telefono: ['phone', 'smartphone'], television: ['tv'], servicios: ['zap', 'droplet', 'flame', 'wifi'], reparacion: ['wrench', 'hammer', 'drill'],
  herramienta: ['wrench', 'hammer', 'drill'], carro: ['car'], auto: ['car'], vehiculo: ['car', 'truck', 'bus'], moto: ['motorbike', 'bike'],
  gasolina: ['fuel'], combustible: ['fuel'], parqueadero: ['parking', 'square-parking'], peaje: ['route', 'road', 'toll', 'milestone'],
  bus: ['bus'], taxi: ['car-taxi', 'taxi'], uber: ['car-taxi', 'car'], bicicleta: ['bike', 'bicycle'], avion: ['plane'], vuelo: ['plane'],
  viaje: ['plane', 'luggage', 'map', 'palmtree', 'tent'], tren: ['train', 'tram'], barco: ['ship', 'sailboat'], transporte: ['bus', 'train', 'car'],
  ropa: ['shirt', 'shopping-bag'], zapatos: ['footprints'], belleza: ['sparkles', 'scissors', 'brush'], peluqueria: ['scissors'],
  gimnasio: ['dumbbell'], deporte: ['dumbbell', 'trophy', 'volleyball', 'bike'], salud: ['heart-pulse', 'stethoscope', 'hospital', 'pill'],
  medico: ['stethoscope', 'hospital'], medicina: ['pill', 'syringe'], medicamento: ['pill'], drogueria: ['pill', 'cross'], hospital: ['hospital'],
  dentista: ['smile'], gafas: ['glasses'], bebe: ['baby'], hijo: ['baby', 'users', 'school'], familia: ['users', 'home', 'heart'],
  mascota: ['paw', 'dog', 'cat', 'fish', 'bird'], perro: ['dog'], gato: ['cat'], veterinario: ['paw', 'stethoscope'],
  regalo: ['gift'], cumpleanos: ['cake', 'party', 'gift'], fiesta: ['party', 'beer', 'music'], donacion: ['hand-heart', 'heart'],
  educacion: ['graduation', 'book', 'school'], colegio: ['school', 'backpack'], universidad: ['graduation', 'university'],
  libro: ['book'], curso: ['book', 'graduation', 'presentation'], trabajo: ['briefcase', 'laptop'], oficina: ['briefcase', 'building', 'printer'],
  computador: ['laptop', 'monitor', 'computer'], tecnologia: ['laptop', 'smartphone', 'cpu'], software: ['code', 'app-window'],
  entretenimiento: ['film', 'gamepad', 'ticket', 'music', 'tv'], cine: ['film', 'clapperboard', 'popcorn'], musica: ['music', 'headphones'],
  juego: ['gamepad', 'dice', 'puzzle'], suscripcion: ['repeat', 'tv', 'music', 'calendar'], netflix: ['tv', 'film'], spotify: ['music'],
  boleta: ['ticket'], concierto: ['music', 'ticket'], seguro: ['shield', 'umbrella'], proteccion: ['shield'], emergencia: ['alert', 'siren', 'shield'],
  otros: ['circle-ellipsis', 'ellipsis', 'circle'], reembolso: ['rotate-ccw', 'undo'], salario: ['briefcase', 'banknote'],
  ingreso: ['trending-up', 'banknote', 'arrow-down'], gasto: ['trending-down', 'shopping', 'receipt'], calendario: ['calendar'],
  cuota: ['calendar', 'credit-card', 'repeat'], nube: ['cloud'], correo: ['mail'], paquete: ['package', 'box'], envio: ['truck', 'package', 'send'],
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// "ShoppingCart" -> "shopping-cart"
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

// Todos los iconos de lucide, un nombre por icono (las variantes "Icon"/"Lucide" y los alias se omiten)
const ALL_ICONS: string[] = (() => {
  const L = LucideIcons as any;
  const seen = new Map<any, string>();
  // Primero los destacados, para que su nombre sea el que se guarde
  for (const k of [...AVAILABLE_ICONS, ...Object.keys(L)]) {
    if (!/^[A-Z]/.test(k) || k.endsWith('Icon') || k.startsWith('Lucide') || k === 'Icon') continue;
    const comp = L[k];
    if (!comp || typeof comp !== 'object') continue;
    if (!seen.has(comp)) seen.set(comp, k);
  }
  return Array.from(seen.values());
})();
const FEATURED = AVAILABLE_ICONS.filter(n => (LucideIcons as any)[n]);
const PAGE = 120;

// El fragmento debe coincidir con palabras completas del nombre: "car" acierta "car" y "car-front", no "credit-card"
const hasFrag = (k: string, f: string) => `-${k}-`.includes(`-${f}-`);
// Palabra en español que coincide con lo escrito: prefijo ("masc" -> "mascota") o plural/variante ("mascotas" -> "mascota")
const esMatches = (es: string, w: string) => es.startsWith(w) || (w.startsWith(es) && w.length - es.length <= 2);

interface IconSelectorProps {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
}

export const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelect }) => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [showAll, setShowAll] = useState(false);

  const results = useMemo(() => {
    const q = norm(query);
    if (!q) return showAll ? ALL_ICONS : FEATURED;
    const words = q.split(/\s+/).filter(Boolean);
    const scored: { name: string; score: number }[] = [];
    for (const name of ALL_ICONS) {
      const k = kebab(name);
      let score = 0;
      for (const w of words) {
        let s = 0;
        // Coincidencia con el nombre en inglés
        if (k === w || k.split('-').includes(w)) s = 3;
        else if (k.includes(w)) s = 2;
        // Coincidencia por palabra en español
        for (const [es, frags] of Object.entries(SPANISH)) {
          if (!esMatches(es, w)) continue;
          const idx = frags.findIndex(f => hasFrag(k, f));
          // El primer fragmento de la lista es el más representativo (mercado -> carrito antes que manzana)
          if (idx >= 0) s = Math.max(s, (es === w ? 4 : 3) + (frags.length - idx) / 10);
        }
        if (s === 0) { score = 0; break; } // todas las palabras deben coincidir
        score += s;
      }
      if (score > 0) scored.push({ name, score: score + (FEATURED.includes(name) ? 1 : 0) });
    }
    return scored.sort((a, b) => b.score - a.score || a.name.length - b.name.length).map(x => x.name);
  }, [query, showAll]);

  const visible = results.slice(0, limit);

  return (
    <div className="border border-slate-600 rounded-lg bg-slate-900 p-2">
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
          placeholder="Buscar icono (ej: carro, mercado, mascota, wifi)"
          className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-7 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500"
          aria-label="Buscar icono"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" aria-label="Limpiar búsqueda">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-52 overflow-y-auto">
        {visible.map(iconName => {
          const IconComponent = (LucideIcons as any)[iconName];
          if (!IconComponent) return null;
          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onSelect(iconName)}
              className={`p-2 rounded flex justify-center items-center transition-all ${selectedIcon === iconName ? 'bg-primary-600 text-white ring-2 ring-primary-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              title={iconName}
              aria-label={iconName}
            >
              <IconComponent size={20} />
            </button>
          );
        })}
        {visible.length === 0 && (
          <p className="col-span-full text-xs text-slate-500 text-center py-4">Sin resultados. Prueba otra palabra, en español o en inglés.</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
        <span>{query ? `${results.length} resultados` : showAll ? `${ALL_ICONS.length} iconos` : `${FEATURED.length} destacados`}</span>
        <div className="flex gap-3">
          {results.length > limit && (
            <button type="button" onClick={() => setLimit(l => l + PAGE)} className="text-primary-400 hover:text-primary-300">Ver más</button>
          )}
          {!query && !showAll && (
            <button type="button" onClick={() => { setShowAll(true); setLimit(PAGE); }} className="text-primary-400 hover:text-primary-300">
              Ver todos ({ALL_ICONS.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
