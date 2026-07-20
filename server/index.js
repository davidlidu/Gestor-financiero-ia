require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// --- MIDDLEWARES GLOBALES ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- CONFIGURACIÓN BASE DE DATOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL condicional: Dokploy interno suele requerir false, nubes externas true
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
});

// --- CONFIGURACIÓN EMAIL (NODEMAILER) ---
const transporter = nodemailer.createTransport({
  service: 'gmail', // O tu proveedor SMTP preferido
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS 
  }
});

// --- INICIALIZACIÓN DE TABLAS ---
const initDB = async () => {
  try {
    // Tabla Usuarios (Actualizada con columnas para 2FA)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar TEXT,
        n8n_url TEXT,
        two_factor_code VARCHAR(10),
        two_factor_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla Transacciones
    await pool.query(`
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
        external_ref VARCHAR(255), -- referencia externa (ej: id de pago de SmartBilling) para idempotencia
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migración: asegurar columna external_ref en instalaciones previas
    await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_ref VARCHAR(255);`);
    // Índice único parcial: un mismo pago externo no puede crear dos ingresos para el mismo usuario
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_external_ref
      ON transactions (user_id, external_ref)
      WHERE external_ref IS NOT NULL;
    `);

    // Tabla Ahorros
    await pool.query(`
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

    // Tabla Categorías
    await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, 
          name VARCHAR(100) NOT NULL,
          icon VARCHAR(50),
          type VARCHAR(20) CHECK (type IN ('income', 'expense')),
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Buscamos si ya hay categorías por defecto insertadas
    const catCheck = await pool.query("SELECT count(*) FROM categories WHERE is_default = TRUE");
    
    if (parseInt(catCheck.rows[0].count) === 0) {
      console.log("Insertando categorías por defecto...");
      
      const allDefaults = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
      
      for (const cat of allDefaults) {
        // user_id es NULL para categorías globales del sistema
        await pool.query(
          "INSERT INTO categories (name, icon, type, is_default) VALUES ($1, $2, $3, TRUE)",
          [cat.name, cat.icon, cat.type]
        );
      }
    }
    
    console.log("Base de datos inicializada correctamente.");
  } catch (err) {
    console.error("Error inicializando DB:", err);
  }
};
initDB();

// --- MIDDLEWARE DE AUTENTICACIÓN (JWT) ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'secret_key_lidutech', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- MIDDLEWARE DE AUTENTICACIÓN DE SERVICIO (API KEY) ---
// Para integraciones máquina-a-máquina (ej: SmartBilling -> Gestor).
const authenticateService = (req, res, next) => {
  const provided = req.headers['x-api-key'];
  const expected = process.env.SERVICE_API_KEY;
  if (!expected) {
    return res.status(503).json({ error: 'Integración no configurada (falta SERVICE_API_KEY).' });
  }
  if (!provided || provided !== expected) {
    return res.sendStatus(401);
  }
  next();
};

// Resuelve el id del usuario del Gestor que recibe los ingresos de facturación.
// Configurable por email (BILLING_INCOME_USER_EMAIL) o por id (BILLING_INCOME_USER_ID).
let cachedBillingUserId = null;
const resolveBillingUserId = async () => {
  if (cachedBillingUserId) return cachedBillingUserId;
  if (process.env.BILLING_INCOME_USER_ID) {
    cachedBillingUserId = parseInt(process.env.BILLING_INCOME_USER_ID, 10);
    return cachedBillingUserId;
  }
  const email = process.env.BILLING_INCOME_USER_EMAIL;
  if (!email) return null;
  const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return null;
  cachedBillingUserId = result.rows[0].id;
  return cachedBillingUserId;
};

// ================= RUTAS DE AUTENTICACIÓN =================

// 1. Registro
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
    if (err.code === '23505') { 
      return res.status(400).json({ message: "El correo ya está registrado." });
    }
    res.status(500).json({ error: err.message });
  }
});

// 2. Login (Paso 1: Valida pass, genera código y envía email)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (result.rows.length === 0) return res.status(401).json({ message: "Usuario no encontrado" });
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) return res.status(401).json({ message: "Contraseña incorrecta" });

    // --- LÓGICA 2FA ---
    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Guardar en DB (Expira en 10 min)
    await pool.query(
      "UPDATE users SET two_factor_code = $1, two_factor_expires = CURRENT_TIMESTAMP + interval '10 minutes' WHERE id = $2",
      [code, user.id]
    );

    // Enviar Email
    const mailOptions = {
      from: '"Lidutech Finanzas" <no-reply@lidutech.net>',
      to: user.email,
      subject: 'Tu código de verificación - Lidutech',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Verificación de Seguridad</h2>
          <p>Tu código para ingresar es:</p>
          <h1 style="color: #10b981; letter-spacing: 5px;">${code}</h1>
          <p>Este código expira en 10 minutos.</p>
        </div>
      `
    };

    // Usamos await para asegurar que el correo salió antes de responder al front
    await transporter.sendMail(mailOptions);

    // Token Temporal (solo sirve para llamar al endpoint verify-2fa)
    const tempToken = jwt.sign(
      { id: user.id, stage: '2fa_pending' }, 
      process.env.JWT_SECRET || 'secret_key_lidutech', 
      { expiresIn: '10m' }
    );
    
    res.json({ 
      requires2FA: true, 
      tempToken,
      message: `Código enviado a ${user.email}` 
    });

  } catch (err) {
    console.error("Error en login/email:", err);
    res.status(500).json({ error: "Error al procesar la solicitud. Verifica las credenciales de correo." });
  }
});

// 3. Verificar 2FA (Paso 2: Valida código y entrega token final)
app.post('/api/auth/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    // Validar token temporal
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'secret_key_lidutech');
      if (decoded.stage !== '2fa_pending') throw new Error("Token incorrecto");
    } catch (e) {
      return res.status(401).json({ message: "Sesión expirada o inválida. Inicia login de nuevo." });
    }

    // Buscar usuario en DB
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];

    if (!user.two_factor_code) return res.status(400).json({ message: "No se ha solicitado ningún código." });
    
    // Validar coincidencia
    if (user.two_factor_code !== code) {
      return res.status(400).json({ message: "Código incorrecto." });
    }

    // Validar expiración
    if (new Date() > new Date(user.two_factor_expires)) {
      return res.status(400).json({ message: "El código ha expirado." });
    }

    // ÉXITO: Limpiar código usado
    await pool.query("UPDATE users SET two_factor_code = NULL, two_factor_expires = NULL WHERE id = $1", [user.id]);

    // Generar Token Final (Larga duración)
    const finalToken = jwt.sign(
      { id: user.id }, 
      process.env.JWT_SECRET || 'secret_key_lidutech', 
      { expiresIn: '7d' }
    );

    res.json({ 
      token: finalToken, 
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

// 4. Obtener Usuario Actual (Persistencia)
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
        n8nUrl: user.n8n_url 
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
    const transactions = result.rows.map(t => ({
      ...t,
      amount: parseFloat(t.amount),
      id: t.id.toString()
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

// ================= INTEGRACIÓN: ABONOS DE FACTURACIÓN (SmartBilling) =================
// Registra un abono de una factura como INGRESO en el Gestor.
// Autenticación por API key de servicio (header x-api-key). Idempotente por external_ref.
app.post('/api/integrations/billing-payment', authenticateService, async (req, res) => {
  try {
    const { amount, date, clientName, reference, description, invoiceNumber, paymentMethod } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount debe ser un número positivo.' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date es requerido en formato YYYY-MM-DD.' });
    }

    const userId = await resolveBillingUserId();
    if (!userId) {
      return res.status(503).json({ error: 'Usuario de facturación no configurado (BILLING_INCOME_USER_EMAIL / BILLING_INCOME_USER_ID).' });
    }

    // Descripción legible
    const parts = ['Abono factura'];
    if (invoiceNumber) parts.push(`#${invoiceNumber}`);
    if (clientName) parts.push(`- ${clientName}`);
    const finalDescription = description || parts.join(' ');

    // paymentMethod del Gestor solo acepta 'cash' | 'transfer'
    const pm = paymentMethod === 'cash' ? 'cash' : 'transfer';

    const result = await pool.query(
      `INSERT INTO transactions (user_id, amount, description, date, category, type, method, payment_method, external_ref)
       VALUES ($1, $2, $3, $4, $5, 'income', 'manual', $6, $7)
       ON CONFLICT (user_id, external_ref) WHERE external_ref IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [userId, parsedAmount, finalDescription, date, 'Facturación', pm, reference || null]
    );

    if (result.rows.length === 0) {
      // Ya existía un ingreso para esta referencia -> idempotente
      return res.status(200).json({ success: true, duplicated: true });
    }

    res.status(201).json({ success: true, id: result.rows[0].id.toString() });
  } catch (err) {
    console.error('[billing-payment] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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

// OBTENER CATEGORÍAS (Mezcla las por defecto + las del usuario)
app.get('/api/categories', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM categories 
         WHERE is_default = TRUE OR user_id = $1 
         ORDER BY type, name`,
        [req.user.id]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // CREAR CATEGORÍA PERSONALIZADA
  app.post('/api/categories', authenticateToken, async (req, res) => {
    try {
      const { name, icon, type } = req.body;
      const result = await pool.query(
        "INSERT INTO categories (user_id, name, icon, type, is_default) VALUES ($1, $2, $3, $4, FALSE) RETURNING *",
        [req.user.id, name, icon, type]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Eliminar categoría
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
    try {
      // Solo permitimos borrar si pertenece al usuario (no las default)
      const result = await pool.query(
        'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id', 
        [req.params.id, req.user.id]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Categoría no encontrada o no tienes permiso" });
      }
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

// Constantes por defecto
const DEFAULT_EXPENSE_CATEGORIES = [
    { name: 'Alimentación', icon: 'Utensils', type: 'expense' },
    { name: 'Transporte', icon: 'Bus', type: 'expense' },
    { name: 'Vivienda', icon: 'Home', type: 'expense' },
    { name: 'Servicios', icon: 'Zap', type: 'expense' },
    { name: 'Entretenimiento', icon: 'Film', type: 'expense' },
    { name: 'Salud', icon: 'Heart', type: 'expense' },
    { name: 'Educación', icon: 'Book', type: 'expense' },
    { name: 'Ropa', icon: 'ShoppingBag', type: 'expense' }
  ];
  
  const DEFAULT_INCOME_CATEGORIES = [
    { name: 'Salario', icon: 'Briefcase', type: 'income' },
    { name: 'Freelance', icon: 'Laptop', type: 'income' },
    { name: 'Facturación', icon: 'FileText', type: 'income' },
    { name: 'Regalos', icon: 'Gift', type: 'income' },
    { name: 'Inversiones', icon: 'TrendingUp', type: 'income' }
  ];


  // RUTA PARA PROCESAR IA (Proxy Seguro)
app.post('/api/ai/process', authenticateToken, async (req, res) => {
    try {
      const { type, base64Data } = req.body; // type: 'receipt' | 'voice'
      
      const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "API Key de Gemini no configurada en el servidor" });
  
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
  
      let prompt = "";
      let mimeType = "";
  
      if (type === 'receipt') {
        prompt = `
        Analiza esta imagen de un recibo o factura. Realiza lo siguiente:
        1. Identifica el TOTAL a pagar del recibo (un solo número final).
        2. Genera una descripción resumiendo los ítems comprados (ej: "Cola & Pola, Queso, Detergente...").
        3. Clasifica el gasto en UNA de estas categorías exactas: 'Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Entretenimiento', 'Salud', 'Educación', 'Ropa'. Si no encaja, usa 'Otros'.
        4. Extrae la fecha (YYYY-MM-DD).
        
        Responde EXCLUSIVAMENTE con un único objeto JSON (no un array) con este formato:
        {
          "amount": número (total del recibo),
          "category": "string (una de la lista)",
          "description": "string (lista de items)",
          "date": "YYYY-MM-DD",
          "type": "expense"
        }
        Sin bloques de código markdown, solo el JSON raw.
      `;
          mimeType = "image/jpeg";
      } else if (type === 'voice') {
          prompt = `Escucha este audio financiero. Extrae: amount (número), category, description, date (YYYY-MM-DD), type ('income' o 'expense'). Responde solo JSON válido sin markdown.`;
          mimeType = "audio/mp3"; // O el formato que envíes
      }
  
      // Limpieza básica del base64 si trae cabeceras
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  
      const result = await model.generateContent([
          prompt,
          { inlineData: { data: cleanBase64, mimeType: mimeType } }
      ]);
  
      const responseText = await result.response.text();
      
      // Limpieza del JSON que devuelve Gemini (a veces pone ```json ... ```)
      const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(jsonStr);
  
      res.json(parsedData);
  
    } catch (err) {
      console.error("Error en Gemini Backend:", err);
      res.status(500).json({ error: "Error procesando IA: " + err.message });
    }
  });

// --- START SERVER ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend Lidutech corriendo en puerto ${PORT}`));

// --- RUTA DE DIAGNÓSTICO ---
// app.get('/api/test-models', async (req, res) => {
//     try {
//       const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
//       if (!apiKey) return res.json({ error: "No hay API Key" });
  
//       const genAI = new GoogleGenerativeAI(apiKey);
      
//       // Esta función lista lo que tu Key tiene permitido ver
//       // Nota: listModels devuelve un async iterable, hay que convertirlo a array
//       const models = [];
//       let response = await genAI.getGenerativeModel({ model: "gemini-pro" }); // Dummy init
      
//       // Usamos el fetch directo si el SDK se pone difícil, o el método del SDK si existe:
//       // En v0.24.1 el manager está oculto, haremos un truco simple:
//       // Intentaremos llamar a un modelo básico.
      
//       res.json({ 
//          message: "Si ves esto, la Key existe. Intenta usar 'gemini-1.5-flash-001' en lugar de 'gemini-1.5-flash'",
//          keyPrefix: apiKey.substring(0, 5) + "..."
//       });
      
//     } catch (err) {
//       res.status(500).json({ error: err.message, stack: err.stack });
//     }
//   });