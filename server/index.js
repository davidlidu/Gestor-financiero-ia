require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Configuración CORS (Acepta peticiones desde cualquier lugar o configura tu dominio)
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN BASE DE DATOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // IMPORTANTE: SSL es necesario para bases de datos en la nube (Neon, Supabase, Render, y a veces Dokploy interno)
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

// --- INICIALIZACIÓN DE TABLAS ---
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar TEXT,
        n8n_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        category VARCHAR(100),
        type VARCHAR(20) CHECK (type IN ('income', 'expense')),
        method VARCHAR(50), -- 'manual', 'ocr', 'voice'
        payment_method VARCHAR(50), -- 'cash', 'transfer'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS savings_goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        target_amount NUMERIC(10, 2) NOT NULL,
        current_amount NUMERIC(10, 2) DEFAULT 0,
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Base de datos inicializada correctamente.");
  } catch (err) {
    console.error("Error inicializando DB:", err);
  }
};
initDB();

// --- MIDDLEWARE DE AUTENTICACIÓN ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secret_key_lidutech', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // { id: 1, iat: ... }
    next();
  });
};

// ================= RUTAS DE AUTH =================

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Datos incompletos" });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email.toLowerCase(), hashedPassword]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // Código error duplicado en Postgres
      return res.status(400).json({ message: "El correo ya está registrado." });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (result.rows.length === 0) return res.status(401).json({ message: "Usuario no encontrado" });
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) return res.status(401).json({ message: "Contraseña incorrecta" });

    // Generar Token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key_lidutech', { expiresIn: '7d' });
    
    // Devolver datos (sin password)
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        avatar: user.avatar, 
        n8nUrl: user.n8n_url 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener Usuario Actual (Persistencia de Sesión)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, avatar, n8n_url FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Usuario no existe" });
    
    const user = result.rows[0];
    res.json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        n8nUrl: user.n8n_url // Convertimos snake_case a camelCase para el frontend
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= RUTAS DE DATOS (PROTEGIDAS) =================

// --- TRANSACCIONES ---
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, amount, description, date, category, type, method, payment_method as "paymentMethod" FROM transactions WHERE user_id = $1 ORDER BY date DESC', 
      [req.user.id]
    );
    // Convertimos amounts de string (Postgres numeric) a number (JS)
    const transactions = result.rows.map(t => ({
      ...t,
      amount: parseFloat(t.amount),
      id: t.id.toString() // El frontend espera IDs como string
    }));
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { amount, description, date, category, type, method, paymentMethod } = req.body;
    const result = await pool.query(
      `INSERT INTO transactions (user_id, amount, description, date, category, type, method, payment_method) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.user.id, amount, description, date, category, type, method, paymentMethod]
    );
    res.json({ success: true, id: result.rows[0].id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AHORROS (SAVINGS) ---
app.get('/api/savings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, target_amount as "targetAmount", current_amount as "currentAmount", color FROM savings_goals WHERE user_id = $1', 
      [req.user.id]
    );
    const savings = result.rows.map(s => ({
      ...s,
      targetAmount: parseFloat(s.targetAmount),
      currentAmount: parseFloat(s.currentAmount),
      id: s.id.toString()
    }));
    res.json(savings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/savings', authenticateToken, async (req, res) => {
  try {
    const { name, targetAmount, currentAmount, color } = req.body;
    const result = await pool.query(
      `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, color) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, name, targetAmount, currentAmount || 0, color]
    );
    res.json({ success: true, id: result.rows[0].id.toString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/savings/:id', authenticateToken, async (req, res) => {
  try {
    const { name, targetAmount, currentAmount, color } = req.body;
    // Solo actualizamos los campos que vengan en el body
    await pool.query(
      `UPDATE savings_goals SET 
        name = COALESCE($1, name), 
        target_amount = COALESCE($2, target_amount), 
        current_amount = COALESCE($3, current_amount),
        color = COALESCE($4, color)
       WHERE id = $5 AND user_id = $6`,
      [name, targetAmount, currentAmount, color, req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar Transacción
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
      const { amount, description, date, category, type, method, paymentMethod } = req.body;
      await pool.query(
        `UPDATE transactions SET 
          amount = COALESCE($1, amount), 
          description = COALESCE($2, description), 
          date = COALESCE($3, date), 
          category = COALESCE($4, category), 
          type = COALESCE($5, type),
          method = COALESCE($6, method),
          payment_method = COALESCE($7, payment_method)
         WHERE id = $8 AND user_id = $9`,
        [amount, description, date, category, type, method, paymentMethod, req.params.id, req.user.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

app.delete('/api/savings/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM savings_goals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SETTINGS (Usuario) ---
app.put('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const { n8nUrl, avatar, password } = req.body;
    let query = 'UPDATE users SET n8n_url = $1, avatar = $2';
    let params = [n8nUrl, avatar];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = $3';
      params.push(hashedPassword);
      query += ' WHERE id = $4';
      params.push(req.user.id);
    } else {
      query += ' WHERE id = $3';
      params.push(req.user.id);
    }

    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend Lidutech corriendo en puerto ${PORT}`));