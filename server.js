import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.css': ['app.css', 'text/css; charset=utf-8'],
  '/app.bundle.js': ['app.bundle.js', 'text/javascript; charset=utf-8'],
};
const port = process.env.PORT || 3000;

createServer(async (request, response) => {
  const asset = files[new URL(request.url, 'http://localhost').pathname];
  if (!asset) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const content = await readFile(path.join(root, asset[0]));
    response.writeHead(200, { 'Content-Type': asset[1] }).end(content);
  } catch {
    response.writeHead(500).end('Could not load the page. Run npm run build first.');
  }
}).listen(port, () => console.log(`RoadTrip Match is listening on port ${port}`));
