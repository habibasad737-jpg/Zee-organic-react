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

// --- INSTA WORLD COURIER ---
// The API key is NOT here: it lives on the server in public/ship-config.php.
export const instaWorld = {
  apiUrl: "https://zeeorganicstore.com/ship.php",
};