import { UserProfile } from '../types';

const KEYS = {
  USERS_DB: 'lidutech_db_users', // Simulates the MySQL Users Table
  SESSION: 'lidutech_session_token', // Stores the persistent login token
};

// Helper to simulate DB delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AuthService = {
  // --- Check Persistent Session ---
  getSession: async (): Promise<UserProfile | null> => {
    try {
      const token = localStorage.getItem(KEYS.SESSION);
      if (!token) return null;

      // Simulate verifying token with backend
      const usersStr = localStorage.getItem(KEYS.USERS_DB);
      const users = usersStr ? JSON.parse(usersStr) : [];
      const user = users.find((u: any) => u.token === token);
      
      return user ? { id: user.id, name: user.name, email: user.email, token: user.token } : null;
    } catch (e) {
      console.error("Error recuperando sesión:", e);
      return null;
    }
  },

  // --- Login ---
  login: async (email: string, password: string): Promise<{ status: 'success' | '2fa_required' | 'error', message?: string, tempToken?: string }> => {
    await delay(500); // Fake network request
    try {
      const cleanEmail = email.toLowerCase().trim();
      const usersStr = localStorage.getItem(KEYS.USERS_DB);
      const users = usersStr ? JSON.parse(usersStr) : [];
      
      const user = users.find((u: any) => u.email === cleanEmail && u.password === password);

      if (user) {
        // In a real app, backend checks password hash
        // Return success but require 2FA
        return { status: '2fa_required', tempToken: 'temp_' + user.id };
      }
      return { status: 'error', message: 'Credenciales inválidas o usuario no encontrado.' };
    } catch (e) {
      console.error(e);
      return { status: 'error', message: 'Error del sistema.' };
    }
  },

  // --- Register ---
  register: async (name: string, email: string, password: string): Promise<{ success: boolean, message?: string }> => {
    await delay(800);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const usersStr = localStorage.getItem(KEYS.USERS_DB);
      const users = usersStr ? JSON.parse(usersStr) : [];
      
      if (users.find((u: any) => u.email === cleanEmail)) {
        return { success: false, message: 'El correo ya está registrado.' };
      }

      const newUser = {
        id: Date.now().toString(),
        name,
        email: cleanEmail,
        password, // In REAL DB: Hash this!
        token: 'token_' + Date.now() // Fake JWT
      };

      users.push(newUser);
      localStorage.setItem(KEYS.USERS_DB, JSON.stringify(users));
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Error al registrar usuario.' };
    }
  },

  // --- Verify 2FA ---
  verify2FA: async (tempToken: string, code: string, rememberDevice: boolean): Promise<UserProfile | null> => {
    await delay(600);
    // Hardcoded for demo: 123456
    if (code !== '123456') {
      throw new Error("Código incorrecto");
    }

    try {
      // Extract ID from temp token
      const parts = tempToken.split('_');
      if (parts.length < 2) throw new Error("Token inválido");
      
      const userId = parts[1];
      const usersStr = localStorage.getItem(KEYS.USERS_DB);
      const users = usersStr ? JSON.parse(usersStr) : [];
      const user = users.find((u: any) => u.id === userId);

      if (!user) throw new Error("Usuario no encontrado");

      // "Generate" session token
      const sessionToken = user.token;

      if (rememberDevice) {
        localStorage.setItem(KEYS.SESSION, sessionToken);
      }

      return { id: user.id, name: user.name, email: user.email, token: sessionToken };
    } catch (e: any) {
      throw new Error(e.message || "Error de verificación");
    }
  },

  logout: () => {
    localStorage.removeItem(KEYS.SESSION);
  }
};