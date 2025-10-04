// middlewares/authorizeScopes.js
function authorizeScopes(...requiredScopes) {
  return (req, res, next) => {
    // scope puede venir en req.oauth.scope o req.user.scopes
    const tokenScopeStr = (req.oauth && req.oauth.scope) || (req.user && req.user.scopes) || '';
    const tokenScopes = tokenScopeStr.split(/\s+/).filter(Boolean);

    const hasAll = requiredScopes.every(s => tokenScopes.includes(s));
    if (!hasAll) {
      return res.status(403).json({ error: 'Insufficient scope' });
    }
    next();
  };
}

module.exports = authorizeScopes;