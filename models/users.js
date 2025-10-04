// models/users.js
const express = require('express');
const authenticateRequest = require('../middlewares/oauthAuthenticate');
const authorizeRole = require('../middlewares/AuthorizationRoles');
const authorizeScopes = require('../middlewares/authorizeScopes');

const registerRouter = require('./register');
const users = registerRouter.users;

const usersRouter = express.Router();
const profileRouter = express.Router();

// GET /users -> admin ve todos los usuarios y sus cuentas (admin + user.read)
usersRouter.get('/', authenticateRequest, authorizeScopes('user.read'), authorizeRole('admin'), (req, res) => {
  const usersWithAccounts = users.map(u => {
    const userAccounts = accounts.filter(a => a.owner === u.username);
    return { id: u.id, username: u.username, role: u.role, scopes: u.scopes, accounts: userAccounts };
  });
  return res.json({ users: usersWithAccounts });
});

// GET /userProfile -> cualquier usuario ve su perfil (user.read)
profileRouter.get('/', authenticateRequest, authorizeScopes('user.read'), (req, res) => {
  const username = req.user.username;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const userAccounts = accounts.filter(a => a.owner === username);
  return res.json({ user: { id: user.id, username: user.username, role: user.role, scopes: user.scopes, accounts: userAccounts } });
});

module.exports = { usersRouter, profileRouter };