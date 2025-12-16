export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO String YYYY-MM-DD
  type: TransactionType;
  method: 'manual' | 'ocr' | 'voice';
  paymentMethod?: 'cash' | 'transfer'; 
  userId?: string; // For MySQL relation
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  userId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string; // Stored locally for simulation
  token?: string; // Session token
  avatar?: string;
  n8nUrl?: string;
}

export interface AuthState {
  view: 'login' | 'register' | 'verify_2fa';
  email: string;
  tempToken?: string; // Temporary token before 2FA
}

export interface ChartDataPoint {
  name: string;
  value: number;
  income?: number;
  expense?: number;
}