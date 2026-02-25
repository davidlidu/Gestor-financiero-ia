# 📋 BACKEND-TODO.md — Endpoints y Tablas Necesarios para Nuevas Funcionalidades
> Las funcionalidades del frontend que los necesitan usan **localStorage** como fallback temporal.
> Cuando David implemente estos endpoints, solo hay que actualizar `storageService.ts`.

---

## 1. 🔴 Budgets (Presupuestos) — PARCIALMENTE IMPLEMENTADO

### Estado actual:
- El frontend (`BudgetTracker.tsx`) YA llama a `/api/budgets` y `/api/budgets?monthYear=YYYY-MM`
- El `storageService.ts` tiene fallback a `localStorage` cuando la API falla
- **Pero el endpoint NO existe en `server/index.js`** — siempre cae en el catch → localStorage

### Tabla SQL necesaria:
```sql
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id),
  category_name VARCHAR(100) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category_id, month_year) -- Un presupuesto por categoría por mes
);
```

### Endpoints necesarios:
```
GET    /api/budgets?monthYear=2026-02
POST   /api/budgets                     { categoryId, categoryName, amount, monthYear }
PUT    /api/budgets/:id                 { amount }
DELETE /api/budgets/:id
```

---

## 2. 🔴 Recurring Transactions (Transacciones Recurrentes) — NO EXISTE

### Tabla SQL necesaria:
```sql
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  type VARCHAR(20) CHECK (type IN ('income', 'expense')),
  payment_method VARCHAR(50),
  frequency VARCHAR(20) CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  next_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  auto_register BOOLEAN DEFAULT FALSE, -- true = se registra automático, false = solo recordatorio
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Endpoints necesarios:
```
GET    /api/recurring                    -- Lista todas las recurrentes del usuario
POST   /api/recurring                    { amount, description, category, type, paymentMethod, frequency, nextDate, autoRegister }
PUT    /api/recurring/:id                { ... campos a actualizar }
DELETE /api/recurring/:id
POST   /api/recurring/:id/process        -- Ejecutar manualmente (crear la transacción real)
```

### Lógica de backend sugerida:
- Un CRON job diario que revise `next_date <= TODAY AND is_active = TRUE`
- Si `auto_register = true`: crear la transacción automáticamente y actualizar next_date
- Si `auto_register = false`: enviar notificación/email de recordatorio

---

## 3. 🟡 AI Chat / Consultas — NO EXISTE

### Endpoint necesario:
```
POST   /api/ai/chat                      { message: string, context?: object }
```

### Implementación sugerida:
```javascript
// En server/index.js, reutilizar la conexión Gemini existente:
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const { message } = req.body;
  
  // 1. Obtener datos del usuario para contexto
  const transactions = await pool.query(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT 100',
    [req.user.id]
  );
  
  const savings = await pool.query(
    'SELECT * FROM savings_goals WHERE user_id = $1',
    [req.user.id]
  );
  
  // 2. Construir prompt con contexto financiero
  const prompt = `Eres un asistente financiero personal. Analiza estos datos y responde la pregunta del usuario.
  
  Transacciones recientes: ${JSON.stringify(transactions.rows)}
  Metas de ahorro: ${JSON.stringify(savings.rows)}
  
  Pregunta del usuario: ${message}
  
  Responde en español, de forma concisa y útil. Si puedes dar números exactos, hazlo.`;
  
  // 3. Llamar a Gemini
  const result = await model.generateContent(prompt);
  res.json({ response: result.response.text() });
});
```

---

## 4. 🟡 AI Insights (Resumen Mensual Automático)

### Endpoint necesario:
```
GET    /api/ai/insights?month=2026-02     -- Genera insight del mes
```

### Implementación sugerida:
- Utilizar Gemini con el contexto de transacciones del mes
- Cachear el resultado para no llamar a Gemini cada vez (puede guardarse en una tabla `insights`)
- Devolver insight como texto corto + datos numéricos

### Tabla SQL opcional (cache de insights):
```sql
CREATE TABLE IF NOT EXISTS ai_insights (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL,
  insight_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month_year)
);
```

---

## 5. 🟢 Reports / Reportes

### Endpoints necesarios:
```
GET    /api/reports/monthly?month=2026-02  -- Resumen mensual
GET    /api/reports/compare?m1=2026-01&m2=2026-02  -- Comparativa
GET    /api/reports/category-trend?months=6  -- Tendencia por categoría
```

> NOTA: Estos NO son urgentes porque toda la lógica de cálculo se puede hacer en el frontend a partir de las transacciones existentes. Solo serían necesarios si el volumen de datos crece mucho y necesitas cálculos en el servidor.

---

## 6. 🟢 N8n Webhook Test

### Endpoint necesario:
```
POST   /api/integrations/n8n/test         -- Envía un ping al webhook configurado
GET    /api/integrations/n8n/status        -- Verifica si el webhook responde
```

---

## Resumen de Prioridades

| # | Feature | Tabla SQL | Endpoints | Prioridad |
|---|---------|-----------|-----------|-----------|
| 1 | Budgets | `budgets` | GET/POST/PUT/DELETE | 🔴 Alto (ya tiene frontend) |
| 2 | Recurring Tx | `recurring_transactions` | GET/POST/PUT/DELETE + CRON | 🔴 Alto |
| 3 | AI Chat | Ninguna | POST /api/ai/chat | 🟡 Medio |
| 4 | AI Insights | `ai_insights` (cache) | GET /api/ai/insights | 🟡 Medio |
| 5 | Reports | Ninguna | GET /api/reports/* | 🟢 Bajo (frontend-only viable) |
| 6 | N8n Test | Ninguna | POST/GET /api/integrations/n8n/* | 🟢 Bajo |
