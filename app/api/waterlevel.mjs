const SOURCE_URL = 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load';
export const maxDuration = 15;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } });
}

export default { async fetch(request) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' }, signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`ThaiWater returned ${response.status}`);
    const payload = await response.json();
    const province = new URL(request.url).searchParams.get('province') || '55';
    const data = (payload?.waterlevel_data?.data || []).filter(record => String(record?.geocode?.province_code || '') === province);
    const timestamps = data.map(record => record?.waterlevel_datetime).filter(Boolean).sort();
    return json({ source: 'https://nan.thaiwater.net/wl', upstream: SOURCE_URL, province, updatedAt: timestamps[timestamps.length - 1] || null, data });
  } catch (error) {
    return json({ error: 'Unable to read ThaiWater data', message: error?.message || 'upstream unavailable' }, 502);
  }
} };
