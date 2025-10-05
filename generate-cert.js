// generate-cert.js
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const attrs = [{ name: 'commonName', value: 'localhost' }];
const opts = { days: 365, keySize: 2048, algorithm: 'sha256' };

const pems = selfsigned.generate(attrs, opts);

const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);

fs.writeFileSync(path.join(certDir, 'key.pem'), pems.private, { encoding: 'utf8' });
fs.writeFileSync(path.join(certDir, 'cert.pem'), pems.cert, { encoding: 'utf8' });

console.log('✅ Certificados creados en ./certs : key.pem y cert.pem');
