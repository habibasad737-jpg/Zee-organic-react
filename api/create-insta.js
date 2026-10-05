// api/create-insta.js - AUTO SEND TO INSTA WORLD
export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { orderId, customerName, phone, address, city, total, items } = req.body;

  // YOUR API KEY - from Vercel env, fallback to your key
  const API_KEY = process.env.INSTA_API_KEY || "2u0q86hz04l55yrz81xy04l55yrz81xy".slice(0,24); // your key
  // Insta World endpoint - their real endpoint is usually:
  const INSTA_URL = "https://one.instaworld.pk/api/orders/create";

  try {
    // Try 3 common formats Insta World uses
    const payload = {
      api_key: "2u0q86hz04l55yrz81xy", // Your key
      order_number: orderId,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: "",
      customer_address: address,
      city: city,
      cod_amount: total,
      weight: "1",
      pieces: "1",
      product_detail: items?.map(i=>`${i.name} x${i.qty}`).join(", ") || "Coffee",
      remarks: `Zee Organic - ${orderId}`
    };

    console.log("Sending to Insta:", payload);

    const response = await fetch(INSTA_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    console.log("Insta Response:", data);

    // Success - return tracking
    return res.status(200).json({ 
      success: true, 
      instaResponse: data,
      tracking: data.tracking_number || data.cn_number || data.awb || data.order_number || "Pending"
    });

  } catch (err) {
    console.error("Insta Error:", err);
    return res.status(200).json({ success: false, error: err.message, note: "Order saved but Insta auto failed - add manually" });
  }
}