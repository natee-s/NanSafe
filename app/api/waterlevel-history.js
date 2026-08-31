const SOURCE_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/iframe/waterlevel_graph';

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`ThaiWater returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function waterlevelHistory(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  if (req.method !== 'GET') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }
  const id = String(req.query?.id || '');
  if (!/^\d+$/.test(id)) {
    send(res, 400, { error: 'A numeric station id is required' });
    return;
  }
  try {
    const payload = await readJson(`${SOURCE_URL}?station_type=tele_waterlevel&id=${encodeURIComponent(id)}`);
    const graph = Array.isArray(payload?.data?.graph_data) ? payload.data.graph_data : [];
    send(res, 200, { source: SOURCE_URL, stationId: id, data: graph });
  } catch (error) {
    send(res, 502, { error: 'Unable to read station history', message: error?.message || 'upstream unavailable' });
  }
};
