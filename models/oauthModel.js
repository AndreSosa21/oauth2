// models/oauthModel.js
const bcrypt = require('bcryptjs');

const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('1234', 10), role: 'admin', scopes: 'user.read user.write' },
  { id: 2, username: 'andre', password: bcrypt.hashSync('1234', 10), role: 'user', scopes: 'user.read' }
];

const clients = [
  {
    id: 'svc_1',
    clientId: 'application',
    clientSecret: 'secret',
    grants: ['client_credentials'],
    scopes: 'service.read service.write'
  },
  {
    id: 'webapp',
    clientId: 'webapp',
    clientSecret: 'websecret',
    grants: ['password', 'refresh_token'],
    scopes: 'user.read user.write'
  }
];

const tokens = [];

module.exports = {
  users,

  getAccessToken(accessToken) {
    const t = tokens.find(x => x.accessToken === accessToken);
    if (!t) {
      console.log('No access token found:', accessToken);
      return null;
    }
    return {
      accessToken: t.accessToken,
      accessTokenExpiresAt: t.accessTokenExpiresAt,
      client: t.client,
      user: t.user,
      scope: t.scope
    };
  },

  getRefreshToken(refreshToken) {
    console.log('🔍 Buscando refresh token:', refreshToken);
    const t = tokens.find(x => x.refreshToken === refreshToken);
    if (!t) {
      console.log('❌ No refresh token found:', refreshToken);
      return null;
    }
    return {
      refreshToken: t.refreshToken,
      refreshTokenExpiresAt: t.refreshTokenExpiresAt,
      client: t.client,
      user: t.user,
      scope: t.scope
    };
  },

  getClient(clientId, clientSecret) {
    const client = clients.find(
      c => c.clientId === clientId && (clientSecret ? c.clientSecret === clientSecret : true)
    );
    if (!client) return null;
    return {
      id: client.id,
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      grants: client.grants,
      scopes: client.scopes
    };
  },

  saveToken(token, client, user) {
    const tokenData = {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      client,
      user,
      scope: token.scope || (user && user.scopes) || (client && client.scopes) || ''
    };

    console.log('💾 Guardando token:', tokenData);
    tokens.push(tokenData);
    return tokenData;
  },

  getUser(username, password) {
    const user = users.find(u => u.username === username);
    if (!user) return null;
    if (!bcrypt.compareSync(password, user.password)) return null;
    return user;
  },

  revokeToken(token) {
    const idx = tokens.findIndex(t => t.refreshToken === token.refreshToken);
    if (idx === -1) return false;
    tokens.splice(idx, 1);
    return true;
  },

  _tokens: tokens,
  _clients: clients
};