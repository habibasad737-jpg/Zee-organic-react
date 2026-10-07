const INSTA_WORLD_URL = "https://one-be.instaworld.pk/logistics/shipments/";

const errorMessage = (data, fallback) => {
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.detail === "string") return data.detail;
  return fallback;
};

export async function createInstaWorldShipment(order, token) {
  if (!token) {
    return {
      status: 503,
      body: {
        success: false,
        error: "Insta World is not configured. Set INSTA_TOKEN in the server environment.",
      },
    };
  }

  if (
    !order ||
    typeof order.customerName !== "string" ||
    typeof order.phone !== "string" ||
    typeof order.address !== "string" ||
    typeof order.city !== "string" ||
    typeof order.orderId !== "string" ||
    !Array.isArray(order.items) ||
    order.items.length === 0 ||
    !Number.isFinite(Number(order.total)) ||
    Number(order.total) <= 0 ||
    !Number.isFinite(Number(order.count)) ||
    Number(order.count) <= 0
  ) {
    return {
      status: 400,
      body: { success: false, error: "Order details are incomplete or invalid." },
    };
  }

  const fullName = order.customerName.trim();
  const nameParts = fullName.split(/\s+/);
  const items = order.items.map((item) => ({
    title: String(item.name || "Product"),
    price: String(Number(item.price) || 0),
    quantity: String(Number(item.qty) || 0),
    kg: "0.5",
  }));
  if (
    !fullName ||
    !String(order.phone).replace(/\D/g, "") ||
    items.some((item) => Number(item.price) <= 0 || Number(item.quantity) <= 0)
  ) {
    return {
      status: 400,
      body: { success: false, error: "Order customer or item details are invalid." },
    };
  }

  const payload = {
    locations_id: 17107,
    ref_no: order.orderId,
    consignee_first_name: nameParts[0] || "Customer",
    consignee_last_name: nameParts.slice(1).join(" ") || "Order",
    consignee_name: fullName,
    consignee_address: order.address,
    consignee_city: order.city.toUpperCase(),
    consignee_email: order.email || "",
    consignee_phone: String(order.phone).replace(/\D/g, ""),
    consignee_country: "PK",
    financial_status: "cod",
    amount: String(Number(order.total)),
    remarks: `Zee Organic order ${order.orderId}`,
    items,
  };

  try {
    const response = await fetch(INSTA_WORLD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `authToken=${token}; userID=16386; username=RHproducts; userType=Merchant`,
        authToken: token,
      },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { message: responseText.slice(0, 500) };
    }

    const providerRejected =
      data?.success === false ||
      data?.status === false ||
      data?.status === "error" ||
      Boolean(data?.error) ||
      Boolean(data?.errors);
    if (!response.ok || providerRejected) {
      const message = errorMessage(
        data,
        `Insta World rejected the shipment (HTTP ${response.status}).`,
      );
      console.error("Insta World rejected a shipment.", {
        status: response.status,
        message,
      });
      return {
        status: 502,
        body: { success: false, error: message },
      };
    }

    const trackingNumber =
      data?.tracking_number ||
      data?.data?.tracking_number ||
      data?.awb_number ||
      data?.data?.awb_number ||
      data?.waybill_number ||
      data?.data?.waybill_number ||
      null;
    return {
      status: 200,
      body: {
        success: true,
        trackingNumber,
        reference: payload.ref_no,
      },
    };
  } catch (error) {
    console.error("Unable to contact Insta World.", error);
    return {
      status: 502,
      body: {
        success: false,
        error: "Could not connect to Insta World. The website order is still saved.",
      },
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  const token =
    process.env.INSTA_TOKEN ||
    process.env.VITE_INSTA_WORLD_API_KEY ||
    process.env.VITE_INSTA_API_KEY;
  const result = await createInstaWorldShipment(req.body, token);
  return res.status(result.status).json(result.body);
}
