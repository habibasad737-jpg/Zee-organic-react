export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  try {
    const o = req.body;
    const fullName = (o.customerName || o.name || 'Customer').trim();
    const parts = fullName.split(' ');

    const payload = {
      locations_id: 17107,
      ref_no: `RH-${Date.now()}`,
      consignee_first_name: parts[0] || 'Customer',
      consignee_last_name: parts.slice(1).join(' ') || 'Order',
      consignee_name: fullName,
      consignee_address: o.address || o.customerAddress || 'N/A',
      consignee_city: (o.city || 'MARDAN').toUpperCase(),
      consignee_email: o.email || 'khansher7377@gmail.com',
      consignee_phone: String(o.phone || '').replace(/\D/g,''),
      consignee_country: "PK",
      financial_status: "cod",
      amount: String(o.total || 0),
      remarks: "RH Products - Call customer",
      items: [{ title: o.productName || "RH Product", price: String(o.total||0), quantity: "1", kg: "0.5" }]
    };

    const token = process.env.INSTA_TOKEN;
    const r = await fetch('https://one-be.instaworld.pk/logistics/shipments/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Cookie': `authToken=${token}; userID=16386; username=RHproducts; userType=Merchant`, 'authToken': token },
      body: JSON.stringify(payload)
    });

    const txt = await r.text();
    let data; try{data=JSON.parse(txt)}catch{data={raw:txt}}
    console.log('Insta:', r.status, data);

    return res.status(200).json({ success:true, trackingNumber: data.tracking_number || data.data?.tracking_number || payload.ref_no, ref: payload.ref_no, insta:data });
  } catch(e){
    return res.status(200).json({ success:true, trackingNumber:`RH-${Date.now()}`, error:e.message });
  }
}