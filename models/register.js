// models/register.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { users } = require('./oauthModel');

const registerRouter = express.Router();

registerRouter.get('/', (req, res) => res.json({ users }));

registerRouter.post('/', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'JSON incomplete' });

  const exists = users.find(u => u.username === username);
  if (exists) return res.status(400).json({ message: 'Username already exists' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      username,
      password: hashed,
      role: username === 'admin' ? 'admin' : 'user',
      scopes: username === 'admin' ? 'user.read user.write' : 'user.read'
    };
    users.push(newUser);
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error hashing password' });
  }
});

registerRouter.users = users;
module.exports = registerRouter;