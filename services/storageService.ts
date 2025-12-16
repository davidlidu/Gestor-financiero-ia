import { Transaction, UserProfile, SavingsGoal } from '../types';
import { INITIAL_SAVINGS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';

const KEYS = {
  TRANSACTIONS: 'lidutech_transactions',
  USER: 'lidutech_user',
  SAVINGS: 'lidutech_savings',
  CATEGORIES_EXPENSE: 'lidutech_cat_expense',
  CATEGORIES_INCOME: 'lidutech_cat_income',
};

export const StorageService = {
  getTransactions: (): Transaction[] => {
    try {
      const data = localStorage.getItem(KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveTransaction: (transaction: Transaction) => {
    const transactions = StorageService.getTransactions();
    const newTransactions = [transaction, ...transactions];
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(newTransactions));
    return newTransactions;
  },

  updateTransaction: (transaction: Transaction) => {
    const transactions = StorageService.getTransactions();
    const index = transactions.findIndex(t => t.id === transaction.id);
    if (index !== -1) {
      transactions[index] = transaction;
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    }
    return transactions;
  },

  deleteTransaction: (id: string) => {
    const transactions = StorageService.getTransactions();
    const newTransactions = transactions.filter(t => t.id !== id);
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(newTransactions));
    return newTransactions;
  },

  getUser: (): UserProfile | null => {
    try {
      const data = localStorage.getItem(KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveUser: (user: UserProfile) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  logout: () => {
    localStorage.removeItem(KEYS.USER);
  },

  getSavings: (): SavingsGoal[] => {
    try {
      const data = localStorage.getItem(KEYS.SAVINGS);
      return data ? JSON.parse(data) : INITIAL_SAVINGS;
    } catch {
      return INITIAL_SAVINGS;
    }
  },

  updateSavings: (savings: SavingsGoal[]) => {
    localStorage.setItem(KEYS.SAVINGS, JSON.stringify(savings));
  },

  saveSavingsGoal: (goal: SavingsGoal) => {
    const savings = StorageService.getSavings();
    const index = savings.findIndex(s => s.id === goal.id);
    if (index !== -1) {
        savings[index] = goal;
    } else {
        savings.push(goal);
    }
    StorageService.updateSavings(savings);
    return savings;
  },

  deleteSavingsGoal: (id: string) => {
      const savings = StorageService.getSavings();
      const newSavings = savings.filter(s => s.id !== id);
      StorageService.updateSavings(newSavings);
      return newSavings;
  },

  // --- Categories Management ---

  getExpenseCategories: (): string[] => {
    try {
      const data = localStorage.getItem(KEYS.CATEGORIES_EXPENSE);
      return data ? JSON.parse(data) : DEFAULT_EXPENSE_CATEGORIES;
    } catch {
      return DEFAULT_EXPENSE_CATEGORIES;
    }
  },

  saveExpenseCategories: (categories: string[]) => {
    localStorage.setItem(KEYS.CATEGORIES_EXPENSE, JSON.stringify(categories));
  },

  getIncomeCategories: (): string[] => {
    try {
      const data = localStorage.getItem(KEYS.CATEGORIES_INCOME);
      return data ? JSON.parse(data) : DEFAULT_INCOME_CATEGORIES;
    } catch {
      return DEFAULT_INCOME_CATEGORIES;
    }
  },

  saveIncomeCategories: (categories: string[]) => {
    localStorage.setItem(KEYS.CATEGORIES_INCOME, JSON.stringify(categories));
  }
};