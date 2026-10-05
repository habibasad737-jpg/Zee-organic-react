export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const API_KEY = process.env.VITE_INSTA_WORLD_API_KEY || process.env.INSTA_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'API_KEY_MISSING_IN_VERCEL' });

    const payload = req.body;

    const endpoints = [
      'https://one.instaworld.pk/api/v1/shipments',
      'https://one.instaworld.pk/api/shipments',
      'https://one.instaworld.pk/api/v1/shipment',
      'https://api.instaworld.pk/api/v1/shipments',
      'https://one.instaworld.pk/api/book',
    ];

    let lastError = null;

    for (const url of endpoints) {
      console.log(`Trying: ${url}`);
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'api-key': API_KEY,
            'x-api-key': API_KEY,
          },
          body: JSON.stringify(payload),
        });
        const txt = await r.text();
        console.log(`URL ${url} -> Status ${r.status} -> ${txt.slice(0,200)}`);
        
        // If it returns JSON (not HTML), this is the correct URL!
        if (txt.trim().startsWith('{') || txt.trim().startsWith('[')) {
          let json;
          try { json = JSON.parse(txt); } catch(e) { continue; }
          return res.status(r.status).json({ tried_url: url, ...json });
        } else {
          lastError = { url, status: r.status, html: txt.slice(0,500) };
        }
      } catch (e) {
        lastError = { url, error: e.message };
      }
    }

    return res.status(500).json({ 
      error: 'ALL_URLS_RETURNED_HTML', 
      message: 'None of the URLs returned JSON. Please get correct API URL from Insta agent.',
      last_attempt: lastError 
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}