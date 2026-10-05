// Edit brand and shipping here. Colours are CSS variables at the top of index.css.
export const brand = {
  name: "Zee Organic Store",
  tagline: "Live Organic, Love Organic",
  currency: "PKR ",
  shippingFee: 79,
  disclaimer:
    "Product information is provided for general informational purposes and is not intended as medical advice. Reviews and ratings shown are demo placeholder data.",
  contact: [
    "Address placeholder",
    "+00 000 000 0000",
    "hello@example.com",
    "Mon–Sat, 9:00–19:00",
  ],
};
export const money = (n) => brand.currency + n.toLocaleString();
