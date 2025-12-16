import { SavingsGoal } from './types';

export const DEFAULT_EXPENSE_CATEGORIES = [
  '🏠 Hogar',
  '🍔 Comida',
  '🚌 Transporte',
  '🏥 Salud',
  '🎬 Entretenimiento',
  '📚 Educación',
  '👕 Ropa',
  '💻 Tecnología',
  '📦 Otros'
];

export const DEFAULT_INCOME_CATEGORIES = [
  '💼 Salario',
  '⚡ Freelance',
  '🎁 Regalo',
  '📈 Inversiones',
  '📦 Otros'
];

export const INITIAL_SAVINGS: SavingsGoal[] = [
  { id: '1', name: 'Fondo de Emergencia', targetAmount: 5000, currentAmount: 1200, color: '#10b981' },
  { id: '2', name: 'Vacaciones', targetAmount: 3000, currentAmount: 850, color: '#3b82f6' },
  { id: '3', name: 'Nuevo Coche', targetAmount: 15000, currentAmount: 4500, color: '#f59e0b' },
];