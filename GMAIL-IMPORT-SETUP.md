# Importar movimientos desde Gmail — Guía de configuración

Esta función permite vincular tu cuenta de Google y crear gastos/ingresos a partir de las
**notificaciones de tus bancos** que llegan a Gmail, revisando y editando cada uno antes de importar.

## 1. Crear credenciales OAuth en Google Cloud

1. Entra a **https://console.cloud.google.com/** e inicia sesión.
2. Crea (o selecciona) un proyecto, ej. `Gestor Financiero Lidutech`.
3. **Habilitar la API de Gmail:** menú → *APIs y servicios → Biblioteca* → busca **"Gmail API"** → *Habilitar*.
4. **Pantalla de consentimiento OAuth** (*APIs y servicios → Pantalla de consentimiento*):
   - Tipo de usuario: **Externo**.
   - Nombre de la app, correo de soporte y correo del desarrollador.
   - **Scopes / Permisos:** agrega `.../auth/gmail.readonly` y `.../auth/userinfo.email`.
   - **Usuarios de prueba:** agrega tu propio correo (`davidlidu0402@gmail.com`) mientras la app esté en modo *Testing*.
5. **Crear credenciales** (*APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth*):
   - Tipo de aplicación: **Aplicación web**.
   - **URI de redireccionamiento autorizado** (debe coincidir EXACTO):
     ```
     https://api.finanzas.lidutech.net/api/google/callback
     ```
     (Para pruebas locales agrega también `http://localhost:4000/api/google/callback`.)
   - Al crear, copia el **Client ID** y el **Client Secret**.

## 2. Variables de entorno del BACKEND (Dokploy)

Agrega estas variables al servicio del backend y **redespliega**:

| Variable | Valor | De dónde sale |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | Client ID del paso 1.5 |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxx` | Client Secret del paso 1.5 |
| `GOOGLE_REDIRECT_URI` | `https://api.finanzas.lidutech.net/api/google/callback` | Debe ser IDÉNTICA a la registrada en Google |
| `APP_URL` | `https://finanzas.lidutech.net` | URL del frontend (a donde vuelve tras vincular) |
| `BANK_EMAIL_SENDERS` | `bancolombia.com.co,nequi.com.co` | *(Opcional)* dominios/correos de bancos a leer, separados por coma |
| `GEMINI_API_KEY` | *(ya lo tienes)* | Se reutiliza para interpretar los correos |
| `SESSION_TOKEN_TTL` | `90d` | *(Opcional)* duración de la sesión; súbela si quieres menos logins |

> Nota: no se requieren dependencias nuevas de npm; se usa `fetch` nativo de Node 20.

## 3. Usar la función

1. Redespliega backend y frontend.
2. En la app → **Ajustes → Google (Gmail)** → *Vincular cuenta de Google* → autoriza.
3. Vuelves a la app → *Importar movimientos* → elige el rango de fechas → *Analizar correos*.
4. Revisa la lista: marca/desmarca, edita tipo, monto, fecha, categoría o descripción de cada uno.
5. *Importar seleccionados*. Los ya importados se marcan para no duplicar (control por el id del correo de Gmail).

## Notas técnicas

- Anti-duplicados: cada movimiento importado guarda `external_ref = gmail:<id-del-correo>` y hay un índice
  único parcial `(user_id, external_ref)`, así que reimportar el mismo correo no crea duplicados.
- El parsing lo hace Gemini (`gemini-2.5-flash-lite`) recibiendo tus categorías para mapear correctamente.
- Solo lectura de Gmail (`gmail.readonly`); la app nunca envía ni borra correos.
- Publicar la app OAuth (salir de modo *Testing*) evita que el permiso caduque a los 7 días; en *Testing*
  Google puede expirar el refresh token periódicamente y tocaría volver a vincular.
