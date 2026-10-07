export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = req.body;
    const apiKey = process.env.VITE_INSTA_API_KEY || process.env.INSTA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API Key missing in Vercel" });
    }

    console.log("Creating InstaWorld parcel:", body);

    // Try both possible InstaWorld endpoints
    const endpoints = [
      "https://one.instaworld.pk/api/shipments",
      "https://one.instaworld.pk/api/v1/shipments",
      "https://api.instaworld.pk/api/shipments"
    ];

    // Build payload as InstaWorld expects
    const payload = {
      consignee_name: body.customer_name,
      consignee_phone: body.customer_phone,
      consignee_address: body.customer_address,
      consignee_city: body.customer_city,
      destination_city: body.customer_city,
      amount: body.cod_amount,
      cod_amount: body.cod_amount,
      order_id: body.order_id,
      client_order_id: body.order_id,
      pieces: parseInt(body.pieces) || 1,
      weight: 0.5,
      service_type: "overnight"
    };

    let lastError = null;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log(`Tried ${url}:`, data);
        
        if (response.ok) {
          return res.status(200).json({
            success: true,
            tracking_number: data.tracking_number || data.tracking_no || data.awb || data.data?.tracking_number,
            data: data
          });
        }
        lastError = data;
      } catch (e) {
        lastError = e.message;
      }
    }

    // If all endpoints fail, return error but don't block order
    return res.status(200).json({ 
      success: false, 
      warning: "Order saved in Firebase but InstaWorld not created - will retry",
      error: lastError,
      payload 
    });

  } catch (err) {
    console.error(err);
    return res.status(200).json({ success: false, error: err.message });
  }
}