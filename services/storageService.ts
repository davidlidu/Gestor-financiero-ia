import { Transaction, UserProfile, SavingsGoal, Category } from '../types';
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

  // Esta función ahora detecta si es crear o editar
  saveSavingsGoal: async (goal: SavingsGoal): Promise<SavingsGoal[]> => {
    try {
      // Si el ID es numérico (o string numérico del backend), asumimos que ya existe
      // Pero para seguridad, mejor verificamos si estamos editando
      // NOTA: Tu App.tsx genera IDs con Date.now() temporalmente, 
      // el backend generará sus propios IDs.
      
      // Lógica simplificada: Intentamos editar si tiene ID válido, si falla o es nuevo, creamos.
      // Para simplificar integración con tu frontend actual:
      
      const isNew = !goal.id || goal.id.length > 10; // Date.now() es largo, IDs de BD suelen ser cortos "1", "2".
      // Mejor estrategia: El frontend debe saber si está editando.

      if (!isNew) {
         // UPDATE
         await fetch(`${API_URL}/savings/${goal.id}`, {
             method: 'PUT',
             headers: getHeaders(),
             body: JSON.stringify(goal)
         });
      } else {
         // CREATE
         await fetch(`${API_URL}/savings`, {
             method: 'POST',
             headers: getHeaders(),
             body: JSON.stringify(goal)
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
  }
};