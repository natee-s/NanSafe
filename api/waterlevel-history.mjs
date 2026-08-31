const SOURCE_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/iframe/waterlevel_graph';
export const maxDuration = 15;

function send(response, status, payload) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return response.status(status).json(payload);
}

async function readJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`ThaiWater returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(request, response) {
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^\d+$/.test(id)) return send(response, 400, { error: 'A numeric station id is required' });
  try {
    const payload = await readJson(`${SOURCE_URL}?station_type=tele_waterlevel&id=${encodeURIComponent(id)}`);
    const data = Array.isArray(payload?.data?.graph_data) ? payload.data.graph_data : [];
    return send(response, 200, { source: SOURCE_URL, stationId: id, data });
  } catch (error) {
    return send(response, 502, { error: 'Unable to read station history', message: error?.message || 'upstream unavailable' });
  }
}
