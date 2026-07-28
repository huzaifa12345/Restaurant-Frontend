const fs = require('fs');
const path = require('path');

const apiUrl = (
  process.env.NG_APP_API_URL ||
  process.env.apiUrl ||
  'https://restaurant-backend-l4wu.onrender.com/api'
).trim();

const mediaBaseUrl = (
  process.env.NG_APP_MEDIA_BASE_URL ||
  process.env.mediaBaseUrl ||
  'https://restaurant-backend-l4wu.onrender.com'
).trim();

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl.replace(/'/g, "\\'")}',
  mediaBaseUrl: '${mediaBaseUrl.replace(/'/g, "\\'")}'
};
`;

const target = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(target, content, 'utf8');
console.log(`Wrote environment.prod.ts\n  apiUrl=${apiUrl}\n  mediaBaseUrl=${mediaBaseUrl}`);
