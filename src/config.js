// Edit brand and shipping here. Colours are CSS variables at the top of index.css.
export const brand = {
  name: "Zee Organic Store",
  tagline: "Live Organic, Love Organic",
  currency: "PKR ",
  shippingFee: 79,
  disclaimer:
    "Product information is provided for general informational purposes and is not intended as medical advice.",
  contact: [
    "Address placeholder",
    "+00 000 000 0000",
    "hello@example.com",
    "Mon-Sat, 9:00-19:00",
  ],
};

export const money = (n) => brand.currency + Number(n || 0).toLocaleString();

// --- INSTA WORLD COURIER CONFIG - FIXED FOR HOSTINGER ---
export const instaWorld = {
  apiKey: import.meta.env.VITE_INSTA_WORLD_API_KEY || import.meta.env.VITE_INSTA_API_KEY || "2u0q86hz04l55yrz81xy",
  locationId: 17107,
  apiUrl: "https://zeeorganicstore.com/ship.php",
  merchantName: "RH products"
};