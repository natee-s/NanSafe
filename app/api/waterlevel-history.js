const SOURCE_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/iframe/waterlevel_graph';

module.exports = async function waterlevelHistory(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const id = String(req.query?.id || '');
  if (!/^\d+$/.test(id)) {
    res.status(400).json({ error: 'A numeric station id is required' });
    return;
  }
  try {
    const upstream = await fetch(`${SOURCE_URL}?station_type=tele_waterlevel&id=${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
    if (!upstream.ok) throw new Error(`ThaiWater returned ${upstream.status}`);
    const payload = await upstream.json();
    const graph = Array.isArray(payload?.data?.graph_data) ? payload.data.graph_data : [];
    res.status(200).json({ source: SOURCE_URL, stationId: id, data: graph });
  } catch (error) {
    res.status(502).json({ error: 'Unable to read station history', message: error.message });
  }
};
