import { Transaction, UserProfile, SavingsGoal, Category, Budget } from '../types';
import { INITIAL_SAVINGS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const KEYS = {
  SESSION: 'lidutech_session_token', // Usamos el mismo key que AuthService
  CATEGORIES_EXPENSE: 'lidutech_cat_expense',
  CATEGORIES_INCOME: 'lidutech_cat_income',
};

// Helper para obtener cabeceras con el Token
const getHeaders = () => {
  const token = localStorage.getItem(KEYS.SESSION);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Helper para manejar errores de respuesta
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Error en la petición API');
  }
  return response.json();
};

export const StorageService = {

  // --- TRANSACTIONS (Desde API) ---

  getTransactions: async (): Promise<Transaction[]> => {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        headers: getHeaders()
      });
      return await handleResponse(response);
    } catch (e) {
      console.error("Error obteniendo transacciones:", e);
      return [];
    }
  },

  saveTransaction: async (transaction: Transaction): Promise<Transaction[]> => {
    try {
      // Backend espera: { amount, description, date, category, type, method, paymentMethod }
      await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(transaction)
      });
      // Recargamos la lista actualizada desde el servidor
      return await StorageService.getTransactions();
    } catch (e) {
      console.error("Error guardando transacción:", e);
      throw e;
    }
  },

  updateTransaction: async (transaction: Transaction): Promise<Transaction[]> => {
    try {
      // NOTA: Asegúrate de agregar la ruta PUT /api/transactions/:id en tu backend
      // Si no la tienes, esto fallará. Te dejaré el código extra abajo.
      await fetch(`${API_URL}/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(transaction)
      });
      return await StorageService.getTransactions();
    } catch (e) {
      console.error("Error actualizando transacción:", e);
      throw e;
    }
  },

  deleteTransaction: async (id: string): Promise<Transaction[]> => {
    try {
      await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await StorageService.getTransactions();
    } catch (e) {
      console.error("Error eliminando transacción:", e);
      throw e;
    }
  },

  // --- USER (Desde API) ---

  // El getUser principal lo maneja AuthService.getSession(), 
  // pero mantenemos esto para actualizaciones de perfil
  saveUser: async (user: UserProfile) => {
    try {
      await fetch(`${API_URL}/user/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          n8nUrl: user.n8nUrl,
          avatar: user.avatar,
          password: user.password // El backend manejará el hash si viene password
        })
      });
      // Actualizamos localStorage solo para redundancia, pero la verdad está en la BD
    } catch (e) {
      console.error("Error guardando perfil:", e);
      throw e;
    }
  },

  // --- SAVINGS (Desde API) ---

  getSavings: async (): Promise<SavingsGoal[]> => {
    try {
      const response = await fetch(`${API_URL}/savings`, { headers: getHeaders() });
      const savings = await handleResponse(response);
      return savings.length > 0 ? savings : INITIAL_SAVINGS; // Fallback inicial visual
    } catch {
      return INITIAL_SAVINGS;
    }
  },
  saveSavingsGoal: async (goal: SavingsGoal): Promise<SavingsGoal[]> => {
    try {
      // Si el ID parece un timestamp (muy largo) o no existe, es POST.
      // Si es corto (ej "1", "55"), es un ID de base de datos -> PUT.
      const isTempId = !goal.id || goal.id.length > 8;

      if (!isTempId) {
        // UPDATE
        await fetch(`${API_URL}/savings/${goal.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(goal)
        });
      } else {
        // CREATE
        // Asegúrate de no enviar el ID temporal al backend
        const { id, ...dataToSend } = goal;
        await fetch(`${API_URL}/savings`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(dataToSend)
        });
      }

      return await StorageService.getSavings();
    } catch (e) {
      console.error("Error guardando ahorro:", e);
      throw e;
    }
  },
  deleteSavingsGoal: async (id: string): Promise<SavingsGoal[]> => {
    try {
      await fetch(`${API_URL}/savings/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await StorageService.getSavings();
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  // --- Categories Management (API) ---

  // Obtener todas las categorías (Ingresos y Gastos juntos)
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await fetch(`${API_URL}/categories`, { headers: getHeaders() });
      return await handleResponse(response);
    } catch (e) {
      console.error("Error cargando categorías", e);
      return [];
    }
  },

  // Crear nueva categoría
  createCategory: async (category: { name: string, icon: string, type: 'income' | 'expense' }): Promise<Category> => {
    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(category)
      });
      return await handleResponse(response);
    } catch (e) {
      console.error("Error creando categoría", e);
      throw e;
    }
  },

  // Eliminar categoría
  deleteCategory: async (id: string): Promise<void> => {
    try {
      await fetch(`${API_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
    } catch (e) {
      console.error("Error eliminando categoría", e);
      throw e;
    }
  },

  // --- BUDGETS (localStorage only — backend endpoints not yet deployed) ---
  getBudgets: async (monthYear: string): Promise<Budget[]> => {
    const key = `lidutech_budgets_${monthYear}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  saveBudget: async (budget: Budget): Promise<Budget[]> => {
    const key = `lidutech_budgets_${budget.monthYear}`;
    const existing: Budget[] = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = existing.findIndex((b: Budget) => b.categoryId === budget.categoryId);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], amount: budget.amount };
    } else {
      budget.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      existing.push(budget);
    }
    localStorage.setItem(key, JSON.stringify(existing));
    return existing;
  },

  deleteBudget: async (id: string, monthYear: string): Promise<Budget[]> => {
    const key = `lidutech_budgets_${monthYear}`;
    const existing: Budget[] = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter(b => b.id !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
    return filtered;
  },

  // --- INSTALLMENTS / CUOTAS (localStorage) ---
  getInstallments: async (): Promise<any[]> => {
    const data = localStorage.getItem('lidutech_installments');
    return data ? JSON.parse(data) : [];
  },

  saveInstallment: async (installment: any): Promise<any[]> => {
    const existing = JSON.parse(localStorage.getItem('lidutech_installments') || '[]');
    if (!installment.id) {
      installment.id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      installment.payments = [];
      existing.push(installment);
    } else {
      const idx = existing.findIndex((i: any) => i.id === installment.id);
      if (idx >= 0) existing[idx] = installment;
    }
    localStorage.setItem('lidutech_installments', JSON.stringify(existing));
    return existing;
  },

  deleteInstallment: async (id: string): Promise<any[]> => {
    const existing = JSON.parse(localStorage.getItem('lidutech_installments') || '[]');
    const filtered = existing.filter((i: any) => i.id !== id);
    localStorage.setItem('lidutech_installments', JSON.stringify(filtered));
    return filtered;
  },

  addInstallmentPayment: async (installmentId: string, payment: { amount: number; date: string; transactionId?: string }): Promise<any[]> => {
    const existing = JSON.parse(localStorage.getItem('lidutech_installments') || '[]');
    const idx = existing.findIndex((i: any) => i.id === installmentId);
    if (idx >= 0) {
      const paymentRecord = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        ...payment
      };
      existing[idx].payments.push(paymentRecord);

      // Update next due date (add 1 month)
      const currentDue = new Date(existing[idx].nextDueDate);
      currentDue.setMonth(currentDue.getMonth() + 1);
      existing[idx].nextDueDate = currentDue.toISOString().substring(0, 10);

      localStorage.setItem('lidutech_installments', JSON.stringify(existing));
    }
    return existing;
  }
};