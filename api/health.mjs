export default function handler(request, response) {
  response.status(200).json({ ok: true, service: 'NanSafe API', time: new Date().toISOString() });
}
