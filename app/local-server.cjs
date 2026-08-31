const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

async function proxyJson(response, url, transform) {
  try {
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    const payload = await upstream.json();
    response.writeHead(upstream.ok ? 200 : 502, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    response.end(JSON.stringify(transform(payload)));
  } catch (error) {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: error.message }));
  }
}

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0]);

  if (requestPath === '/live-waterlevel' || requestPath === '/api/waterlevel') {
    proxyJson(response, 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load', payload => {
      const data = (payload?.waterlevel_data?.data || []).filter(item => String(item?.geocode?.province_code || '') === '55');
      return { source: 'https://nan.thaiwater.net/wl', updatedAt: data.map(item => item?.waterlevel_datetime).filter(Boolean).sort().at(-1) || null, data };
    });
    return;
  }

  if (requestPath === '/api/waterlevel-history' || requestPath.startsWith('/live-waterlevel-history/')) {
    const id = requestPath.startsWith('/live-waterlevel-history/')
      ? requestPath.split('/').pop()
      : new URL(request.url || '/', 'http://localhost').searchParams.get('id');
    if (!/^\d+$/.test(id || '')) {
      response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'A numeric station id is required' }));
      return;
    }
    proxyJson(response, `https://api-v3.thaiwater.net/api/v1/thaiwater30/iframe/waterlevel_graph?station_type=tele_waterlevel&id=${encodeURIComponent(id)}`, payload => ({ source: 'https://nan.thaiwater.net/wl', stationId: id, data: payload?.data?.graph_data || [] }));
    return;
  }

  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^[/\\]+/, '');
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root + path.sep) && filePath !== path.join(root, 'index.html')) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(content);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`NanSafe is running at http://127.0.0.1:${port}`);
});
