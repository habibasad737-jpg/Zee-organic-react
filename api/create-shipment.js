export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const AUTH = "3e63b21ea4132ff3deb085a2480397a36e654d44"; // Your working token

  try {
    const b = req.body;

    // 1. City ID - MARDAN = 17107 confirmed from your screenshot
    let locId = 17107;
    const cityName = (b.customer_city || b.city || "MARDAN").toUpperCase();
    try {
      const r = await fetch("https://one-be.instaworld.pk/courier/cities/searchableActiveCourierCities?all=1", {
        headers: { "authToken": AUTH }
      });
      const j = await r.json();
      const cities = j.data || [];
      const match = cities.find(c => c.name?.toUpperCase().includes(cityName) || cityName.includes(c.name?.toUpperCase()));
      if (match) locId = match.id;
    } catch(e){}

    const fullName = (b.customer_name || b.name || "Customer").trim();
    const parts = fullName.split(" ");

    const payload = {
      locations_id: locId,
      ref_no: (b.order_id || "RH"+Date.now()).toString().slice(0,20),
      consignee_name: "",
      consignee_first_name: parts[0] || "Customer",
      consignee_last_name: parts.slice(1).join(" ") || "Order",
      consignee_phone: String(b.customer_phone || b.phone || ""),
      consignee_address: String(b.customer_address || b.address || ""),
      consignee_city: cityName,
      consignee_email: b.customer_email || b.email || "khansher7377@gmail.com",
      amount: String(b.cod_amount || b.total || 2500),
      financial_status: "cod",
      remarks: `Order ${b.order_id || ""}`,
      items: (b.items || [{name:"gold serum", price:2500, qty:1}]).map(i=>({
        title: i.name || i.title || "gold serum",
        sku: "",
        price: String(i.price || 2500),
        quantity: String(i.qty || i.quantity || 1).padStart(2,'0'), // "01" like your form
        kg: "0.5",
        product_detail: ""
      }))
    };

    console.log("Sending:", JSON.stringify(payload));

    const resp = await fetch("https://one-be.instaworld.pk/logistics/shipments/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "authToken": AUTH
      },
      body: JSON.stringify(payload)
    });

    const text = await resp.text();
    console.log("Status:", resp.status, "Response:", text);

    let data; try { data = JSON.parse(text); } catch { data = {raw:text}; }

    return res.status(200).json({
      success: resp.ok,
      tracking_number: data.tracking_number,
      insta_response: data
    });

  } catch (err) {
    return res.status(200).json({ success:false, error: err.message });
  }
}