const SOURCE_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load';

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

module.exports = async function waterlevel(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  if (req.method !== 'GET') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }
  try {
    const payload = await readJson(SOURCE_URL);
    const all = Array.isArray(payload?.waterlevel_data?.data) ? payload.waterlevel_data.data : [];
    const province = String(req.query?.province || '55');
    const data = all.filter(record => String(record?.geocode?.province_code || '') === province);
    const timestamps = data.map(record => record?.waterlevel_datetime).filter(Boolean).sort();
    const updatedAt = timestamps[timestamps.length - 1] || null;
    send(res, 200, { source: 'https://nan.thaiwater.net/wl', upstream: SOURCE_URL, province, updatedAt, data });
  } catch (error) {
    send(res, 502, { error: 'Unable to read ThaiWater data', message: error?.message || 'upstream unavailable' });
  }
};
