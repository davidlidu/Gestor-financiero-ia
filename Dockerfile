# Stage 1: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# --- CAMBIO IMPORTANTE AQUÍ ---
# Recibimos la variable con el nombre EXACTO que busca tu vite.config.ts
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
# ------------------------------

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Configuración básica de Nginx
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]