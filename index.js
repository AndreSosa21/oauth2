// index.js (HTTPS + redirect HTTP -> HTTPS + OAuth config ajustada)
require('dotenv').config();
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const OAuth2Server = require('oauth2-server');
const Request = OAuth2Server.Request;
const Response = OAuth2Server.Response;

const oauthModel = require('./models/oauthModel');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Servir frontend estático (public/)
app.use(express.static('public'));

/* Lifetimes (mantener sincronizado con frontend) */
const ACCESS_LIFETIME = 60;   // segundos (1 minuto)
const REFRESH_LIFETIME = 120; // segundos (2 minutos)

/* Configure OAuth server */
app.oauth = new OAuth2Server({
  model: oauthModel,
  accessTokenLifetime: ACCESS_LIFETIME,
  refreshTokenLifetime: REFRESH_LIFETIME,
  allowBearerTokensInQueryString: true
});

/* Token endpoint (password, client_credentials, refresh_token) */
app.post('/oauth/token', (req, res) => {
  const request = new Request(req);
  const response = new Response(res);
  app.oauth.token(request, response)
    .then(token => {
      // oauth2-server normalmente escribe en response; devolvemos JSON limpio
      res.json({
        access_token: token.accessToken || token.access_token,
        refresh_token: token.refreshToken || token.refresh_token,
        expires_in: Math.floor((token.accessTokenExpiresAt - new Date()) / 1000),
        token_type: 'Bearer',
        scope: token.scope || ''
      });
    })
    .catch(err => {
      res.status(err.code || 500).json(err);
    });
});

/* Middleware reusable to protect routes (usado por tus routers) */
function authenticateRequest(req, res, next) {
  const request = new Request(req);
  const response = new Response(res);
  app.oauth.authenticate(request, response)
    .then(token => {
      req.user = token.user;
      req.oauth = token;
      next();
    })
    .catch(err => {
      res.status(err.code || 401).json(err);
    });
}

/* Routers y rutas */
const registerRouter = require('./models/register');
const { usersRouter, profileRouter } = require('./models/users');

app.use('/register', registerRouter);
app.use('/users', authenticateRequest, usersRouter);       // protegiendo mount
app.use('/userProfile', authenticateRequest, profileRouter);

/* Root */
app.get('/', (req, res) => res.json({ message: 'API OAuth2 ready (HTTPS)' }));

// endpoint de ejemplo que valida token en memoria y scope service.read
app.get('/serviceInfo', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || null;
  if (!token) return res.status(401).json({ message: 'No token' });

  const oauthModel = require('./models/oauthModel');
  const t = oauthModel._tokens.find(x => x.accessToken === token);
  if (!t) return res.status(401).json({ message: 'Invalid token' });

  const scopeStr = t.scope || '';
  if (!scopeStr.split(/\s+/).includes('service.read')) {
    return res.status(403).json({ message: 'Insufficient scope' });
  }

  return res.json({ service: 'demo', status: 'ok', client: t.client.clientId || t.client.id });
});

/* --- DEV-only route: emitir client_credentials token desde el servidor ---
   NOTA: Esta ruta es para facilitar pruebas locales. NO la uses en producción.
   Devuelve un access_token con scope del cliente 'application'.
*/
app.get('/demo/service-token', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not allowed in production' });
  }

  try {
    // Obtener cliente "application" del modelo
    const client = oauthModel.getClient('application');
    if (!client) return res.status(500).json({ message: 'Service client not found in model' });

    // Construimos un "user" asociado al client (como lo hace getUserFromClient)
    const user = oauthModel.getUserFromClient(client);

    // Generar access token aleatorio
    const accessToken = crypto.randomBytes(40).toString('hex');
    const accessTokenExpiresAt = new Date(Date.now() + (ACCESS_LIFETIME * 1000));

    // token object (similar a lo que maneja oauth2-server)
    const token = {
      accessToken,
      accessTokenExpiresAt,
      scope: client.scopes || ''
    };

    // Guardar token usando la función del modelo
    const saved = oauthModel.saveToken(token, {
      id: client.id,
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      grants: client.grants,
      scopes: client.scopes
    }, user);

    // Responder en formato OAuth2
    return res.json({
      access_token: saved.accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor((saved.accessTokenExpiresAt - new Date()) / 1000),
      scope: saved.scope || ''
    });
  } catch (err) {
    console.error('Error generating demo service token:', err);
    return res.status(500).json({ message: 'Error generating token' });
  }
});

/* --- HTTPS server setup --- */
const CERT_DIR = path.join(__dirname, 'certs');
const keyPath = path.join(CERT_DIR, 'key.pem');
const certPath = path.join(CERT_DIR, 'cert.pem');

let httpsOptions = {};
try {
  httpsOptions.key = fs.readFileSync(keyPath);
  httpsOptions.cert = fs.readFileSync(certPath);
} catch (err) {
  console.error('No se encontraron certificados en ./certs. Crea certs/key.pem y certs/cert.pem');
  console.error('Para pruebas locales puedes usar: openssl req -x509 -newkey rsa:4096 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"');
  // salimos para evitar dejar el server en http accidentalmente
  process.exit(1);
}

const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const HTTP_PORT = process.env.PORT || 3000;

// Start HTTPS server
const httpsServer = https.createServer(httpsOptions, app);
httpsServer.listen(HTTPS_PORT, () => console.log(`HTTPS Server listening on port ${HTTPS_PORT}`));

// Optionally redirect HTTP -> HTTPS (useful para development local)
const httpApp = express();
httpApp.use((req, res) => {
  const host = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
  return res.redirect(`https://${host}:${HTTPS_PORT}${req.url}`);
});
http.createServer(httpApp).listen(HTTP_PORT, () => console.log(`HTTP Server listening on port ${HTTP_PORT} and redirecting to HTTPS:${HTTPS_PORT}`));

module.exports = app;
