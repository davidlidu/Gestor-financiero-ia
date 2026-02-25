# 📝 CHANGELOG — DeerSystems Financial IA

## [2.1.0] - 2026-02-25 — Fase 2 + Fase 3 Parcial

### 📊 NEW: Vista de Reportes (Fase 3)
- **Nuevo componente `ReportsView.tsx`** con análisis financiero detallado
- **Selector mensual** con navegación prev/next para cambiar mes analizado
- **Cards de resumen**: Ingresos, Egresos y Flujo Neto con trend indicators %
- **Gráfica de 6 meses**: Barras comparativas Ingresos vs Gastos últimos 6 meses
- **Top Categorías**: Ranking de categorías más gastadas/ingresadas con barras de progreso e iconos
- **Stats de métodos IA**: Conteo de movimientos por método (Manual, OCR, Voz)
- **Comparativa mensual**: Tabla de mes actual vs mes anterior con variaciones
- Agregado tab **"Reportes"** en navegación (sidebar + bottom bar)
- No requiere nuevos endpoints — funciona 100% con data existente del frontend

### 🎯 Dashboard Mejorado (Fase 2)
- **Hero cards rediseñadas**: Layout 2-column en mobile
  - Saldo Disponible: card ancha con gradiente emerald→teal
  - Ingresos/Egresos: con **trend indicators** ↑↓ % vs mes anterior
- **Widget "Últimos Movimientos"**: Top 5 transacciones recientes en el dashboard
  - Clicables para editar
  - Con iconos de categoría
  - Botón "Ver todos →" para ir a transacciones
- **Card de Ahorro Total**: Ahora muestra cantidad de metas activas
- **Hover borders** con colores temáticos (emerald, red, blue)

### 📋 TransactionsView Rediseñada (Fase 2)
- **Agrupación por fecha**: Transacciones agrupadas bajo "Hoy", "Ayer", "Esta Semana", "Enero 2026"
- **Layout card-based**: Reemplaza la tabla HTML por cards más limpias
- **Iconos de categoría**: Cada transacción muestra su icono con fondo coloreado
- **Badges de método IA**: Tags inline para OCR (📷) y Voz (🎙️)
- **Botón eliminar con hover**: Solo aparece en desktop al pasar el mouse
- **Header compacto**: Título + conteo + botones CSV/Ahorros

### ✨ Loading Screen (Fase 2)
- **Splash screen branded**: Logo DS pulsante con shimmer bar animada
- Reemplaza el viejo spinner "..." por pantalla DeerSystems profesional

---

## [2.0.0] - 2026-02-23 — Fase 2: Rediseño UX/UI

### 🎨 Rebranding
- **Renombrado** de "GastosAI / Lidutech Finanzas" a **DeerSystems Financial IA**
- Nuevo logo con iniciales **"DS"** y gradiente verde esmeralda → teal
- Actualizado título de página, PWA manifest, sidebar, header mobile, y pantalla de login
- Paleta de colores principal: **emerald/teal** (verde esmeralda)

### 📱 Navegación Mobile Mejorada
- **Bottom Navigation Bar** reemplaza el hamburger menu en mobile
  - 5 tabs: Inicio, Movimientos, Metas, Reportes, Ajustes
  - Iconos con labels, estado activo con highlight esmeralda
  - Backdrop blur para efecto glassmorphism
  - Safe-area-bottom para dispositivos iOS con notch
- **Header mobile simplificado**: Solo logo + tema toggle + logout

### ✨ Quick Actions FAB (Floating Action Button)
- FAB expandible con 4 opciones: ✏️ Manual, 📷 OCR, 🎙️ Voz, 💰 Transferir
- **Animaciones staggered** al abrir/cerrar
- Visible en Dashboard, Transacciones y Metas

### 🔔 Toast Notifications
- **Sistema completo de notificaciones Toast** reemplaza todos los `alert()` nativos
- 4 variantes: ✅ Success, ❌ Error, ⚠️ Warning, ℹ️ Info
- **Barra de progreso** + animación slide-in
- Hook `useToast()` para uso fácil

### 🛠️ Mejoras Técnicas
- **TransactionModal** acepta `initialTab` prop
- Shimmer animation CSS para loading
- Custom scrollbar styles para dark mode
- Safe-area-bottom utility CSS
- Código TypeScript: compilación sin errores

### 📋 Documentación
- ✅ `AUDIT.md` — Auditoría completa
- ✅ `BACKEND-TODO.md` — Endpoints y tablas SQL
- ✅ `CHANGELOG.md` — Este archivo

---

## [1.x.x] - Versiones anteriores (Pre-DeerSystems)
- Dashboard con saldo, ingresos, egresos, ahorro total
- Gestión de movimientos (manual, OCR, voz)
- Metas de ahorro con barras de progreso
- Presupuestos básicos (BudgetTracker)
- Export CSV
- Auth con 2FA por email
- Categorías editables
- Integración N8n webhook
- PWA con service worker
