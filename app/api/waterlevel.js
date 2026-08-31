const SOURCE_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load';

module.exports = async function waterlevel(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const upstream = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' } });
    if (!upstream.ok) throw new Error(`ThaiWater returned ${upstream.status}`);
    const payload = await upstream.json();
    const all = Array.isArray(payload?.waterlevel_data?.data) ? payload.waterlevel_data.data : [];
    const province = String(req.query?.province || '55');
    const data = all.filter(record => String(record?.geocode?.province_code || '') === province);
    const updatedAt = data.map(record => record?.waterlevel_datetime).filter(Boolean).sort().at(-1) || null;
    res.status(200).json({ source: 'https://nan.thaiwater.net/wl', upstream: SOURCE_URL, province, updatedAt, data });
  } catch (error) {
    res.status(502).json({ error: 'Unable to read ThaiWater data', message: error.message });
  }
};
