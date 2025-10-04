// index.js
require('dotenv').config();
const express = require('express');
const OAuth2Server = require('oauth2-server');
const Request = OAuth2Server.Request;
const Response = OAuth2Server.Response;

const oauthModel = require('./models/oauthModel');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


/* Configure OAuth server */
app.oauth = new OAuth2Server({
  model: oauthModel,
  accessTokenLifetime: 120,       // 1 hour
  refreshTokenLifetime: 60 * 60 * 24, // 1 day
  allowBearerTokensInQueryString: true
});

/* Token endpoint (password, client_credentials, refresh_token) */
app.post('/oauth/token', (req, res) => {
  const request = new Request(req);
  const response = new Response(res);
  app.oauth.token(request, response)
    .then(token => {
      // OAuth2-server writes the token into response object; we send JSON
      res.json(token);
    })
    .catch(err => {
      res.status(err.code || 500).json(err);
    });
});

/* Middleware reusable to protect routes */
function authenticateRequest(req, res, next) {
  const request = new Request(req);
  const response = new Response(res);
  app.oauth.authenticate(request, response)
    .then(token => {
      // token includes user, client, scope...
      req.user = token.user;
      req.oauth = token; // useful si quieres scope/info extra
      next();
    })
    .catch(err => {
      res.status(err.code || 401).json(err);
    });
}

/* Routers and routes */
const registerRouter = require('./models/register');
const { usersRouter, profileRouter } = require('./models/users');
const accountsRoutes = require('./models/accountsRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

app.use('/register', registerRouter);
app.use('/users', authenticateRequest, usersRouter);       // protegiendo mount
app.use('/userProfile', authenticateRequest, profileRouter);
app.use('/accounts', authenticateRequest, accountsRoutes);
app.use('/transactions', authenticateRequest, transactionRoutes);

/* Root */
app.get('/', (req, res) => res.json({ message: 'API OAuth2 ready' }));

/* Start */
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;