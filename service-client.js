// service-client.js
// Simula un microservicio que obtiene un access_token por client_credentials
// y llama a /serviceInfo.
// Uso: node service-client.js
// Para desarrollo local con certificado self-signed puedes ejecutar:
//   PowerShell:  $env:NODE_TLS_REJECT_UNAUTHORIZED=0; node service-client.js
//   Bash:         NODE_TLS_REJECT_UNAUTHORIZED=0 node service-client.js

const API = process.env.API_BASE || 'https://localhost:3443';

// Credenciales del cliente de servicio (existe en oauthModel)
const CLIENT_ID = 'application';
const CLIENT_SECRET = 'secret';

async function getClientToken() {
  const url = `${API}/oauth/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });

  const res = await fetch(url, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    // No añadimos opciones TLS aquí; si necesitas ignorar verificación, define
    // NODE_TLS_REJECT_UNAUTHORIZED=0 en el entorno al ejecutar (solo dev).
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(json)}`);
  return json;
}

async function callServiceInfo(token) {
  const url = `${API}/serviceInfo`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

(async () => {
  try {
    console.log('Requesting client_credentials token for microservice...');
    const tok = await getClientToken();
    console.log('Token received:', {
      access_token: tok.access_token ? tok.access_token.slice(0, 12) + '...' : '(none)',
      scope: tok.scope,
      expires_in: tok.expires_in
    });

    console.log('Calling /serviceInfo with the service token...');
    const r = await callServiceInfo(tok.access_token);
    console.log('serviceInfo response:', r.status, r.body);
  } catch (err) {
    console.error('Error in service-client:', err.message || err);
    process.exit(1);
  }
})();
