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

export interface Category {
  id: string; // o number, dependiendo de tu DB, pero el front suele manejarlo como string para inputs
  name: string;
  icon: string;
  type: 'income' | 'expense';
  isDefault?: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  userId?: string;
  monthYear: string; // Format: YYYY-MM
}

export interface InstallmentPayment {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  transactionId?: string; // Links to a Transaction record
}

export interface Installment {
  id: string;
  name: string;
  totalDebt: number;
  totalInstallments: number;
  monthlyAmount: number; // Calculated: totalDebt / totalInstallments
  source: string; // Bank/card name, e.g. "Nu Colombia"
  category?: string;
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  payments: InstallmentPayment[];
  userId?: string;
}