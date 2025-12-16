# Gestor Financiero Lidutech AI

Una aplicación web progresiva (PWA) para la gestión de finanzas personales, potenciada por Inteligencia Artificial (Google Gemini) para el procesamiento de facturas y notas de voz.

## Características Principales

1.  **Dashboard Completo**: 
    *   Visualización de saldo, ingresos, egresos y **total ahorrado**.
    *   Gráficas de Tendencia y Distribución Modernas (Estilo Donut).
    *   Navegación interactiva: Haz clic en las tarjetas para ver el detalle.
2.  **Gestión de Movimientos**: 
    *   Ingreso Manual (Efectivo/Transferencia).
    *   **Escaneo OCR**: Toma una foto a una factura.
    *   **Nota de Voz**: Dicta tu gasto.
    *   **Transferencia a Ahorros**: Mueve dinero de tu billetera principal a metas específicas.
    *   **Exportar a CSV**: Descarga tu historial de movimientos compatible con Excel.
3.  **Control de Ahorros**: Define metas visuales con barras de progreso.
4.  **Integraciones**: 
    *   Conexión a **N8n** vía Webhook configurable desde ajustes.
5.  **Personalización**:
    *   **Subida de Foto de Perfil** (Almacenamiento local).
    *   Cambio de contraseña.
    *   Categorías editables.

## Requisitos para Funciones de IA

*   **HTTPS**: Requerido para Cámara y Micrófono.
*   **API Key de Google Gemini**: Configurada como variable de entorno `API_KEY` o `VITE_API_KEY`.

## Instructivo de Despliegue en Dokploy

Dokploy es una solución de despliegue similar a Vercel/Netlify pero self-hosted. Sigue estos pasos para desplegar esta aplicación React:

### 1. Preparación del Repositorio
Asegúrate de que tu proyecto tenga un archivo `Dockerfile` en la raíz. Si no lo tienes, crea uno con el siguiente contenido para una aplicación React (Vite):

```dockerfile
# Stage 1: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Asegúrate de pasar la variable de entorno en el build si es necesaria
ARG API_KEY
ENV API_KEY=$API_KEY
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Configuración básica de Nginx para SPA (Single Page Apps)
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Configuración en Dokploy

1.  Ingresa a tu panel de **Dokploy**.
2.  Ve a tu proyecto y selecciona **"Application"**.
3.  Haz clic en **"Create Service"** -> **"Application"**.
4.  Ponle un nombre (ej: `lidutech-finanzas`).
5.  Selecciona tu proveedor de Git (GitHub/GitLab) y el repositorio/rama.

### 3. Variables de Entorno

1.  En la pestaña **"Environment"** de tu aplicación en Dokploy.
2.  Agrega la clave:
    *   Key: `API_KEY`
    *   Value: `(Tu clave de Google Gemini AI Studio)`
3.  Guarda los cambios.

### 4. Configuración de Build

1.  En la pestaña **"Settings"** o **"Build"**:
    *   Build Type: `Dockerfile` (Recomendado con el archivo de arriba).
    *   Docker Context: `/`
    *   Docker Path: `./Dockerfile`

### 5. Dominio y HTTPS (Crucial para Cámara/Voz)

1.  Ve a la pestaña **"Domains"**.
2.  Agrega tu dominio (ej: `finanzas.midominio.com`).
3.  Asegúrate de habilitar **"Enable SSL"** (Let's Encrypt) para generar el certificado HTTPS automáticamente. Sin esto, las funciones de IA no abrirán la cámara ni el micrófono en móviles.

### 6. Desplegar

Haz clic en **"Deploy"**. Dokploy construirá la imagen Docker y lanzará el contenedor.