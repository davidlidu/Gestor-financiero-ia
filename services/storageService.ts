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

const LOCAL_BUDGET_PREFIX = 'lidutech_budgets_';
let budgetMigration: Promise<void> | null = null;

// Sube a la nube, una sola vez, los presupuestos que estaban guardados solo en este navegador.
// Si algo falla no se borra nada local y se reintenta en la próxima carga.
const migrateLocalBudgets = (): Promise<void> => {
  if (!budgetMigration) {
    budgetMigration = (async () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_BUDGET_PREFIX));
      if (keys.length === 0) return;
      const items: { categoryId: string; categoryName: string; amount: number; monthYear: string }[] = [];
      for (const key of keys) {
        try {
          const list: Budget[] = JSON.parse(localStorage.getItem(key) || '[]');
          list.forEach(b => items.push({
            categoryId: b.categoryId,
            categoryName: b.categoryName,
            amount: b.amount,
            monthYear: b.monthYear || key.substring(LOCAL_BUDGET_PREFIX.length)
          }));
        } catch { /* entrada corrupta: se ignora */ }
      }
      if (items.length > 0) {
        const response = await fetch(`${API_URL}/budgets/import`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ items })
        });
        if (!response.ok) throw new Error('No se pudieron migrar los presupuestos locales');
      }
      keys.forEach(k => localStorage.removeItem(k));
    })().catch(e => {
      console.error('Migración de presupuestos:', e);
      budgetMigration = null; // reintentar en la próxima llamada
    });
  }
  return budgetMigration;
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

  // Une varias categorías en una (mueve movimientos y presupuestos)
  mergeCategories: async (sourceIds: string[], targetId: string): Promise<{ movedTransactions: number; movedBudgets: number; removed: number }> => {
    const response = await fetch(`${API_URL}/categories/merge`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sourceIds, targetId })
    });
    return await handleResponse(response);
  },

  // Cambia el icono de una categoría personal
  updateCategoryIcon: async (id: string, icon: string): Promise<Category> => {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ icon })
    });
    return await handleResponse(response);
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

  // --- BUDGETS (API) ---
  // Los presupuestos viven en el servidor para compartirse entre web y celular.
  getBudgets: async (monthYear: string): Promise<Budget[]> => {
    try {
      await migrateLocalBudgets();
      const response = await fetch(`${API_URL}/budgets?month=${encodeURIComponent(monthYear)}`, { headers: getHeaders() });
      return await handleResponse(response);
    } catch (e) {
      console.error("Error obteniendo presupuestos:", e);
      return [];
    }
  },

  // Crea el presupuesto de la categoría en ese mes o actualiza su monto si ya existía
  saveBudget: async (budget: Budget): Promise<Budget[]> => {
    await migrateLocalBudgets();
    const response = await fetch(`${API_URL}/budgets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        categoryId: budget.categoryId,
        categoryName: budget.categoryName,
        amount: budget.amount,
        monthYear: budget.monthYear
      })
    });
    await handleResponse(response);
    return await StorageService.getBudgets(budget.monthYear);
  },

  // Copia los presupuestos de un mes a otro; los que ya existen en el destino no se tocan
  copyBudgets: async (from: string, to: string): Promise<{ copied: number; skipped: number }> => {
    const response = await fetch(`${API_URL}/budgets/copy`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ from, to })
    });
    return await handleResponse(response);
  },

  deleteBudget: async (id: string, monthYear: string): Promise<Budget[]> => {
    const response = await fetch(`${API_URL}/budgets/${id}`, { method: 'DELETE', headers: getHeaders() });
    await handleResponse(response);
    return await StorageService.getBudgets(monthYear);
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