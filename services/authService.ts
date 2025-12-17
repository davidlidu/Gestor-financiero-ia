import { UserProfile } from '../types';

// Obtener la URL de la API desde las variables de entorno de Vite/Dokploy
// Si no existe, usa localhost por defecto para desarrollo
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const KEYS = {
  SESSION: 'lidutech_session_token',
};

export const AuthService = {
  // --- Check Persistent Session (Validar token al recargar) ---
  getSession: async (): Promise<UserProfile | null> => {
    try {
      const token = localStorage.getItem(KEYS.SESSION);
      if (!token) return null;

      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Si el token expiró o es inválido, cerramos sesión local
        localStorage.removeItem(KEYS.SESSION);
        return null;
      }

      const data = await response.json();
      // Asumimos que el backend devuelve el objeto de usuario en data.user
      return { ...data.user, token }; 
    } catch (e) {
      console.error("Error recuperando sesión:", e);
      return null;
    }
  },

  // --- Login ---
  login: async (email: string, password: string): Promise<{ status: 'success' | '2fa_required' | 'error', message?: string, tempToken?: string, user?: UserProfile }> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { status: 'error', message: data.message || 'Credenciales inválidas' };
      }

      // Caso 1: El backend pide 2FA
      if (data.requires2FA) {
        return { 
          status: '2fa_required', 
          tempToken: data.tempToken, // Token temporal solo para validar el código
          message: 'Verificación de dos pasos requerida' 
        };
      }

      // Caso 2: Login exitoso directo (sin 2FA o ya verificado)
      if (data.token) {
        localStorage.setItem(KEYS.SESSION, data.token);
        return { status: 'success', user: { ...data.user, token: data.token } };
      }

      return { status: 'error', message: 'Respuesta inesperada del servidor' };

    } catch (e) {
      console.error(e);
      return { status: 'error', message: 'Error de conexión con el servidor.' };
    }
  },

  // --- Register ---
  register: async (name: string, email: string, password: string): Promise<{ success: boolean, message?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.message || 'Error al registrar usuario.' };
      }

      return { success: true, message: 'Registro exitoso' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Error de conexión al intentar registrarse.' };
    }
  },

  // --- Verify 2FA ---
  verify2FA: async (tempToken: string, code: string, rememberDevice: boolean): Promise<UserProfile | null> => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Código incorrecto");
      }

      // Login exitoso tras 2FA
      const sessionToken = data.token;
      
      if (rememberDevice) {
        localStorage.setItem(KEYS.SESSION, sessionToken);
      } else {
        // Opción: Si no recuerda dispositivo, quizás usar sessionStorage o manejo en memoria
        // Por compatibilidad con App.tsx actual, usaremos localStorage temporalmente
        localStorage.setItem(KEYS.SESSION, sessionToken);
      }

      return { ...data.user, token: sessionToken };

    } catch (e: any) {
      throw new Error(e.message || "Error de verificación");
    }
  },

  // --- Logout ---
  logout: () => {
    localStorage.removeItem(KEYS.SESSION);
    // Opcional: Llamar al backend para invalidar el token si usas lista negra
    // fetch(`${API_URL}/auth/logout`, ...);
  }
};