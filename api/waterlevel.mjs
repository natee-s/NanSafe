const SOURCE_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load';
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
  try {
    const url = new URL(request.url);
    const province = url.searchParams.get('province') || '55';
    const payload = await readJson(SOURCE_URL);
    const all = Array.isArray(payload?.waterlevel_data?.data) ? payload.waterlevel_data.data : [];
    const data = all.filter(record => String(record?.geocode?.province_code || '') === province);
    const timestamps = data.map(record => record?.waterlevel_datetime).filter(Boolean).sort();
    return send(response, 200, { source: 'https://nan.thaiwater.net/wl', upstream: SOURCE_URL, province, updatedAt: timestamps[timestamps.length - 1] || null, data });
  } catch (error) {
    return send(response, 502, { error: 'Unable to read ThaiWater data', message: error?.message || 'upstream unavailable' });
  }
}
