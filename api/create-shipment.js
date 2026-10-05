export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const API_KEY = process.env.VITE_INSTA_WORLD_API_KEY || process.env.VITE_INSTA_API_KEY || process.env.INSTA_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'API_KEY_MISSING_IN_VERCEL' });

    const payload = req.body;
    
    const r = await fetch('https://one.instaworld.pk/api/v1/shipments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const txt = await r.text();
    let json;
    try { json = JSON.parse(txt); } 
    catch { return res.status(500).json({ error: 'INSTA_RETURNED_HTML', status: r.status, html: txt.slice(0, 600) }); }

    return res.status(r.status).json(json);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}