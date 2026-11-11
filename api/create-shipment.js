// api/create-shipment.js
// Serverless function to book shipments on InstaWorld Courier

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const apiKey =
    process.env.VITE_INSTA_API_KEY ||
    process.env.INSTA_API_KEY ||
    process.env.VITE_INSTA_WORLD_API_KEY ||
    req.body?.apiKey ||
    "2u0q86hz04l55yrz81xy";

  const defaultLocId = Number(
    process.env.VITE_INSTA_LOCATION_ID ||
    process.env.INSTA_LOCATION_ID ||
    req.body?.location_id ||
    17107 // Default: Mardan / RH Products confirmed location
  );

  try {
    const b = req.body || {};

    const fullName = (b.customer_name || b.customerName || b.name || "Customer").trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "Customer";

    let rawPhone = String(b.customer_phone || b.phone || "").replace(/\D/g, "");
    if (rawPhone.startsWith("92") && rawPhone.length === 12) {
      rawPhone = "0" + rawPhone.slice(2);
    }
    const cleanPhone = rawPhone || "03000000000";

    const cityName = String(b.customer_city || b.city || "MARDAN").trim().toUpperCase();

    // Combined address
    let fullAddress = b.customer_address || b.address || "";
    if (typeof fullAddress === "object") {
      fullAddress = [fullAddress.building, fullAddress.area, fullAddress.locality, fullAddress.city, fullAddress.province]
        .filter(Boolean)
        .join(", ");
    }
    fullAddress = String(fullAddress || `${cityName}, Pakistan`).trim();

    const orderId = String(b.order_id || b.orderId || `RH${Date.now()}`).trim();
    const amount = Number(b.cod_amount || b.total || 0);
    const email = b.customer_email || b.email || "khansher7377@gmail.com";
    const remarks = b.remarks || `Order ${orderId}`;

    // Normalize items
    const rawItems = Array.isArray(b.items) && b.items.length ? b.items : [{ name: "Zee Organic Product", price: amount, qty: 1 }];
    const items = rawItems.map(i => ({
      title: String(i.name || i.title || "Zee Organic Product"),
      sku: String(i.sku || i.id || ""),
      quantity: Number(i.qty || i.quantity || 1),
      price: Number(i.price || amount),
      kg: 0.5,
      product_detail: ""
    }));

    console.log(`[InstaWorld] Processing shipment for Order ${orderId}, City: ${cityName}, Amount: ${amount}`);

    // --- ATTEMPT 1: InstaWorld Merchant API v2 ---
    const v2Payload = {
      location_id: defaultLocId,
      ref_no: orderId,
      payment: {
        type: "cod",
        amount: amount
      },
      consignee: {
        first_name: firstName,
        last_name: lastName,
        phone: cleanPhone,
        email: email,
        address: fullAddress.slice(0, 200),
        city: cityName
      },
      items: items.map(i => ({
        title: i.title,
        sku: i.sku,
        quantity: i.quantity,
        price: i.price,
        kg: i.kg,
        product_detail: i.product_detail
      })),
      remarks: remarks.slice(0, 200)
    };

    let trackingNumber = null;
    let lastResponse = null;

    try {
      const v2Resp = await fetch("https://one-be.instaworld.pk/merchant-api/v2/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Idempotency-Key": orderId
        },
        body: JSON.stringify(v2Payload)
      });

      const v2Text = await v2Resp.text();
      try { lastResponse = JSON.parse(v2Text); } catch { lastResponse = { raw: v2Text }; }

      if (v2Resp.ok) {
        trackingNumber = lastResponse?.data?.tracking_number || lastResponse?.tracking_number;
        if (trackingNumber) {
          console.log(`[InstaWorld v2] Success! Tracking: ${trackingNumber}`);
          return res.status(200).json({
            success: true,
            tracking_number: trackingNumber,
            api_version: "v2",
            data: lastResponse
          });
        }
      } else {
        console.warn(`[InstaWorld v2] Returned ${v2Resp.status}:`, v2Text.slice(0, 300));
      }
    } catch (v2Err) {
      console.warn("[InstaWorld v2] Request error:", v2Err.message);
    }

    // --- ATTEMPT 2: InstaWorld Logistics / Portal API ---
    // Resolving location ID if city lookup is needed
    let locId = defaultLocId;
    try {
      const cityRes = await fetch("https://one-be.instaworld.pk/logistics/searchableActiveCities", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Token ${apiKey}`,
          "authToken": apiKey
        }
      });
      if (cityRes.ok) {
        const cityData = await cityRes.json();
        const cities = cityData.data || cityData.results || [];
        const match = cities.find(c => c.name?.toUpperCase().includes(cityName) || cityName.includes(c.name?.toUpperCase()));
        if (match && match.id) locId = match.id;
      }
    } catch {}

    const legacyPayload = {
      locations_id: locId,
      ref_no: orderId.slice(0, 20),
      consignee_name: fullName,
      consignee_first_name: firstName,
      consignee_last_name: lastName,
      consignee_phone: cleanPhone,
      consignee_address: fullAddress,
      consignee_city: cityName,
      consignee_email: email,
      amount: String(amount),
      financial_status: "cod",
      remarks: remarks,
      items: items.map(i => ({
        title: i.title,
        sku: i.sku || "",
        price: String(i.price),
        quantity: String(i.quantity).padStart(2, '0'),
        kg: "0.5",
        product_detail: ""
      }))
    };

    try {
      const legacyResp = await fetch("https://one-be.instaworld.pk/logistics/shipments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Token ${apiKey}`,
          "authToken": apiKey,
          "Cookie": `authToken=${apiKey}; userID=16386; username=RHproducts; userType=Merchant`
        },
        body: JSON.stringify(legacyPayload)
      });

      const legacyText = await legacyResp.text();
      let legacyData;
      try { legacyData = JSON.parse(legacyText); } catch { legacyData = { raw: legacyText }; }

      if (legacyResp.ok) {
        trackingNumber = legacyData.tracking_number || legacyData.data?.tracking_number || legacyData.awb;
        if (trackingNumber) {
          console.log(`[InstaWorld Legacy] Success! Tracking: ${trackingNumber}`);
          return res.status(200).json({
            success: true,
            tracking_number: trackingNumber,
            api_version: "legacy",
            data: legacyData
          });
        }
      } else {
        console.warn(`[InstaWorld Legacy] Returned ${legacyResp.status}:`, legacyText.slice(0, 300));
        if (!lastResponse) lastResponse = legacyData;
      }
    } catch (legacyErr) {
      console.warn("[InstaWorld Legacy] Request error:", legacyErr.message);
    }

    // If both failed to assign a tracking number
    return res.status(200).json({
      success: false,
      error: "InstaWorld courier could not book the parcel. Check API credentials or network.",
      details: lastResponse
    });

  } catch (err) {
    console.error("[InstaWorld Handler Error]:", err);
    return res.status(200).json({ success: false, error: err.message });
  }
}

