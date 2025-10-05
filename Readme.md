# OAuth2 Demo (API + Frontend)

Proyecto demo que implementa un servidor OAuth2 (grant types: `password`, `refresh_token`, `client_credentials`) y un frontend local para probar flujos de autenticación, refresh automático y llamadas a endpoints protegidos.

> En este repo el servidor corre **sobre HTTPS local** (self-signed). El frontend estático se sirve desde `public/` y **debes usar la página frontend** para las pruebas principales (es obligatorio seguir la guía del frontend). La sección de Postman está marcada como **opcional**.

---

## Contenido

- `index.js` — servidor Express + OAuth2 (HTTPS)
- `models/` — `oauthModel.js`, `register.js`, `users.js`, `accounts.js`
- `middlewares/` — `oauthAuthenticate.js`, `authorizeScopes.js`, `AuthorizationRoles.js`
- `public/auth-frontend.html` — frontend de pruebas (UI, conteo de tokens, refresh automático)
- `certs/` — certificados `key.pem` y `cert.pem` (self-signed para dev)
- `package.json`

---

## Requisitos (prerequisitos)

- Node.js >= 16 (recomendado) y npm
- Windows / macOS / Linux (las instrucciones son cross-platform)
- Navegador moderno (Chrome / Edge / Firefox)
- **Postman (opcional)** si quieres probar la API fuera del frontend

---

## Instalación (rápida)

1. Clona el repo o copia los archivos al directorio del proyecto.
2. En la raíz del proyecto ejecuta:

```bash
npm install
```
Esto instalará las dependencias del proyecto (express, oauth2-server, bcryptjs, dotenv, etc.).

---

## Generar certificados HTTPS (self-signed)

Necesitamos certificados para el servidor HTTPS local. Hay dos opciones: OpenSSL o script Node (no necesita OpenSSL).

1. Instala selfsigned como dev-dependency
```bash
npm install --save-dev selfsigned
```

2. Ejecuta:
```bash
node generate-cert.js
```
Verifica que certs/key.pem y certs/cert.pem existen.

---

## Iniciar el servidor

Asegúrate de tener certs/key.pem y certs/cert.pem en ./certs.

Ejecuta:
```bash
npm start
```

Salida esperada (ejemplo):

```bash
HTTPS Server listening on port 3443
HTTP Server listening on port 3000 and redirecting to HTTPS:3443
```

- El servidor HTTPS por defecto está en https://localhost:3443.
- El servidor HTTP en http://localhost:3000 redirige a HTTPS.

---

## Configuración importante de tokens (lifetimes)

En index.js se configuró:
```bash
accessTokenLifetime: 60   // access token expira en 60 segundos (1 minuto)
refreshTokenLifetime: 120 // refresh token expira en 120 segundos (2 minutos)
```

Estos valores se usan en el servidor. El frontend también asume access = 60s y refresh = 120s para mostrar los contadores en tiempo real. Si cambias los valores en el servidor, actualiza las constantes del frontend (ACCESS_LIFETIME / REFRESH_LIFETIME).

---

## Probar desde la página frontend

```bash
https://localhost:3443/auth-frontend.html
```

Nota: La primera vez el navegador mostrará advertencia por certificado self-signed — elige Advanced → Proceed to localhost para aceptar de forma temporal.

---

### Flujo de prueba desde el frontend (paso a paso)
1. Campos por defecto (prueba rápida):
- username: admin
- password: 1234
- client_id: webapp
- client_secret: websecret

2. Click Iniciar sesión:
- El frontend hará POST /oauth/token con grant_type=password.
- Si OK verás Login OK y se mostrarán:
- Access (contador MM:SS → empieza en 01:00)
- Refresh (contador MM:SS → empieza en 02:00)

3. Click Ver /userProfile:
- Llama a /userProfile con Authorization: Bearer <access_token>.
- Si el access_token expiró, el frontend intentará automáticamente refresh usando refresh_token, guardará el nuevo access_token y reintentará la petición.

4. Click Ver /users:
- Requiere role: admin y scope user.read. Usa admin para ver la lista completa.

5. Click Generar token (client_credentials):
- El frontend pedirá token con client_id=application y client_secret=secret.
- Guarda el token de servicio y lo puedes usar para llamar /serviceInfo.

6. Click Llamar /serviceInfo:
- Envía el token de servicio en header y devuelve { service: 'demo', status: 'ok', client: 'application' } si el token tiene service.read.

7. Observa los contadores:
- Access baja en tiempo real.
- Cuando Access llega a 00:00, la primera petición protegida devolverá 401 y el frontend intentará refresh automáticamente (si Refresh aún es válido).
- Si Refresh llega a 00:00, el refresh fallará y tendrás que iniciar sesión de nuevo.

---

## Endpoints principales

- POST /oauth/token — token endpoint (grant password, refresh_token, client_credentials)
- GET /userProfile — perfil del usuario (requiere user.read)
- GET /users — lista de usuarios (requiere role admin y scope user.read)
- GET /serviceInfo — endpoint demo que requiere service.read (para tokens client_credentials)

---

## Desarrollo y debugging

- El modelo guarda tokens en memoria (array). Revisa models/oauthModel.js y su variable tokens si quieres inspeccionar los tokens activos.
- Logs útiles:
- - oauthModel.getAccessToken y getRefreshToken realizan console.log para facilitar debugging.
- Para ver errores de autenticación revisa la consola donde ejecutaste npm start.

---

## Diagramas UML

Esta sección muestra la arquitectura del proyecto OAuth2 dividida en **componentes** y **secuencia de ejecución**.

Los diagramas están escritos en **PlantUML**, por lo que puedes renderizarlos fácilmente en VS Code con la extensión `PlantUML` o en línea en [https://www.plantuml.com/plantuml](https://www.plantuml.com/plantuml).

---

### Diagrama de Componentes

Este diagrama muestra los principales módulos del sistema: el **Frontend**, el **Servidor HTTPS**, el **Modelo OAuth2**, los **Middlewares**, y los **Módulos de negocio**.  
Permite entender cómo cada capa interactúa con las demás.

<img width="1064" height="900" alt="image" src="https://github.com/user-attachments/assets/be200433-1d6c-4ec4-84e0-4871ffec5dc6" />


---

### Diagrama de Secuencia

Describe el flujo completo del sistema:
1. Login (password grant)
2. Llamada a recurso protegido con token válido
3. Token expirado → Refresh automático → Retry exitoso

<img width="1652" height="1252" alt="image" src="https://github.com/user-attachments/assets/87766355-baab-4837-b57f-3d6965507837" />


## Opcional: Probar con Postman

Si prefieres usar Postman para algunas pruebas (opcional), aquí tienes las requests principales (recuerda desactivar verificación SSL en Postman para aceptar el certificado self-signed).

1) Password grant (obtener access + refresh)

- Method: POST
- URL: https://localhost:3443/oauth/token
- Headers:
- - Content-Type: application/x-www-form-urlencoded
- Body (x-www-form-urlencoded):
 ```ini
grant_type = password
username = admin
password = 1234
client_id = webapp
client_secret = websecret
```

2) Llamar endpoint protegido

- Method: GET
- URL: https://localhost:3443/userProfile
- Headers:
- - Authorization: Bearer <ACCESS_TOKEN>

3) Refresh token

- Method: POST
- URL: https://localhost:3443/oauth/token
- Headers:
- - Content-Type: application/x-www-form-urlencoded
- Body:
```ini
grant_type = refresh_token
refresh_token = <REFRESH_TOKEN>
client_id = webapp
client_secret = websecret
```

4) Client credentials

- Method: POST
- URL: https://localhost:3443/oauth/token
- Body:
```ini
grant_type = client_credentials
client_id = application
client_secret = secret
```
