// middlewares/oauthAuthenticate.js
const OAuth2Server = require('oauth2-server');
const Request = OAuth2Server.Request;
const Response = OAuth2Server.Response;

function authenticateRequest(req, res, next) {
  const oauth = req.app.oauth;
  const request = new Request(req);
  const response = new Response(res);

  oauth.authenticate(request, response)
    .then(token => {
      req.user = token.user;
      req.oauth = token;
      next();
    })
    .catch(err => {
      res.status(err.code || 401).json(err);
    });
}

module.exports = authenticateRequest;