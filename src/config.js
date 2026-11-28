// Edit brand and shipping here. Colours are CSS variables at the top of index.css.
export const brand = {
  name: "Zee Organic Store",
  tagline: "Live Organic, Love Organic",
  currency: "PKR ",
  shippingFee: 250,
  disclaimer:
    "Our herbal, honey, seed, and organic food products are natural agricultural goods and are not intended to diagnose, treat, cure, or prevent any medical condition.",
  business: {
    address:
      "Room # 1, Tayyab Urdgan Hostel, Meer hassan Street, Near Comsats University, Abbottabad, Khyber Pakhtunkhwa, Pakistan",
    whatsapp: "03390662021",
    email: "organicstorezee@gmail.com",
  },
};

export const money = (n) => brand.currency + Number(n || 0).toLocaleString();

// --- INSTA WORLD COURIER ---
// The API key is NOT here: it lives on the server in public/ship-config.php.
export const instaWorld = {
  apiUrl: "https://zeeorganicstore.com/ship.php",
};