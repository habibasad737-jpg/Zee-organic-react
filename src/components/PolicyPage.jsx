import { brand } from "../config.js";

const FEE = `PKR ${brand.shippingFee}`;
const EFFECTIVE = "November 27, 2026";
const { whatsapp, email, address } = brand.business;

export const policyLinks = [
  ["/terms-and-conditions", "Terms & Conditions"],
  ["/privacy-policy", "Privacy Policy"],
  ["/refund-policy", "Refund & Return Policy"],
  ["/shipping-policy", "Shipping Policy"],
];

const policies = {
  "/terms-and-conditions": {
    title: "Terms & Conditions",
    intro:
      "Welcome to Zee Organic Store (https://zeeorganicstore.com/). By accessing our website and placing an order, you agree to be bound by the following Terms and Conditions:",
    items: [
      ["Business Information", "Zee Organic Store operates out of Abbottabad, Khyber Pakhtunkhwa, Pakistan, offering natural and organic food items, herbs, seeds, honey, coffee, and beverages."],
      ["Products & Pricing", "All product prices are listed in Pakistani Rupees (PKR). We reserve the right to update product prices, descriptions, or stock availability at any time without prior notice."],
      ["Orders & Acceptance", "Placing an order on our website constitutes an offer to purchase. We reserve the right to accept or decline any order due to stock availability, pricing errors, or incomplete shipping details."],
      ["Advance Delivery Fee (COD Order Confirmation)", `To prevent fake orders and confirm Cash on Delivery (COD) shipments, Zee Organic Store requires an advance payment of ${FEE} (covering standard delivery charges) via PayFast at checkout. The remaining product total is payable in cash to the courier upon delivery.`],
      ["Full Online Payment Option", "Customers may also choose to pay the full order total (products plus delivery charges) upfront via PayFast."],
      ["Product & Health Disclaimer", "Our herbal, honey, seed, and organic food products are natural agricultural goods and are not intended to diagnose, treat, cure, or prevent any medical condition. Customers with allergies or medical conditions should consult a qualified healthcare professional before use."],
      ["Intellectual Property", "All logos, product photographs, text, and website content belong to Zee Organic Store and may not be copied, reproduced, or reused without written permission."],
      ["Governing Law & Jurisdiction", "These Terms and Conditions are governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. Any disputes shall fall under the jurisdiction of the courts in Abbottabad, Pakistan."],
    ],
  },
  "/refund-policy": {
    title: "Refund, Return & Cancellation Policy",
    intro:
      "At Zee Organic Store, we take strict care in sourcing, testing, and packing organic consumables. Because our products are natural and consumable food items, our cancellation, return, and refund rules are as follows:",
    items: [
      ["Cancellations Before Dispatch", `You may cancel your order free of charge before it is handed over to our courier partner in Abbottabad by messaging us on WhatsApp at ${whatsapp} or emailing ${email}. Your advance delivery payment of ${FEE} will be refunded in full within 5 to 7 business days.`],
      ["Advance Delivery Fee Non-Refundable After Dispatch", `Once your order has been dispatched from our Abbottabad store, the ${FEE} delivery confirmation payment is strictly non-refundable to cover two-way courier and packaging expenses. This applies if the order is canceled mid-transit, the customer is unreachable by phone, an incomplete address is provided, or the Cash on Delivery (COD) parcel is refused at the doorstep.`],
      ["Eligible Returns & Replacements (Damaged or Wrong Item)", "We accept returns or offer free replacements within 7 days of delivery only if you received the wrong item, the product arrived damaged, leaking, or with a broken seal, or the product was expired upon arrival. In verified cases of damaged, expired, or incorrect items, you are eligible for a free replacement or a full refund (including your delivery charges)."],
      ["Non-Returnable Items", "For hygiene and food safety reasons, opened, unsealed, or partially consumed food, honey, coffee, seed, or herbal products cannot be returned unless defective or damaged upon arrival."],
      ["How to Request a Return or Refund", `Contact us via WhatsApp at ${whatsapp} or email ${email} within 7 days of delivery with your Order Number and clear photos or a short unboxing video showing the damaged or incorrect item.`],
      ["Refund Processing Time", "Once verified, approved refunds are processed within 5 to 7 business days back to your original payment method (bank account, mobile wallet, or card via PayFast)."],
    ],
  },
  "/shipping-policy": {
    title: "Shipping & Delivery Policy",
    items: [
      ["Dispatch Location", "All orders are packed and dispatched from Zee Organic Store, Abbottabad, Khyber Pakhtunkhwa, Pakistan."],
      ["Delivery Charges & COD Confirmation", `Standard delivery charges are ${FEE} nationwide across Pakistan. For Cash on Delivery (COD) orders, this delivery charge is collected upfront via PayFast to confirm your shipment, and only the remaining product price is collected in cash upon delivery.`],
      ["Order Processing Time", "Orders are processed and handed over to our courier partners within 1 to 2 business days (excluding Sundays and public holidays)."],
      ["Estimated Delivery Timelines", "Abbottabad & Nearby Areas: 1–2 business days | Major Cities (Islamabad, Rawalpindi, Lahore, Peshawar, Karachi): 2–4 business days | Other Cities & Towns Nationwide: 3–6 business days."],
      ["Accurate Address & Phone Number", "Please ensure your complete street address and active mobile/WhatsApp number are entered accurately at checkout. If a parcel is returned due to an incorrect address or repeated unavailability, re-shipping charges will apply."],
    ],
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    intro:
      "Zee Organic Store respects your privacy and is committed to protecting your personal information:",
    items: [
      ["Information We Collect", "When you place an order or contact us, we collect your name, shipping address, phone/WhatsApp number, email address, and order details."],
      ["Payment Security", "We do not store your credit/debit card numbers, bank account passwords, or mobile wallet PINs on our servers. All online payments are encrypted and processed securely through PCI-DSS compliant payment gateways such as PayFast."],
      ["How We Use Your Information", "We use your information strictly to process and deliver your orders, send order confirmations and tracking updates, provide customer support, and prevent fraudulent orders."],
      ["Third-Party Sharing", "We only share necessary delivery information (name, address, phone number) with our courier partners and transaction details with our authorized payment processor (PayFast). We never sell, rent, or trade your personal data to third parties."],
      ["Contact & Data Requests", "For privacy inquiries or to update/delete your customer information, reach us using the details below."],
    ],
  },
};

export const isPolicyPath = (path) => Boolean(policies[path]);

export default function PolicyPage({ path }) {
  const p = policies[path];
  return (
    <main className="policy-page wrap">
      <h1>{p.title}</h1>
      <p className="policy-date">
        <b>Effective Date:</b> {EFFECTIVE}
      </p>
      {p.intro && <p>{p.intro}</p>}
      <ul>
        {p.items.map(([h, t]) => (
          <li key={h}>
            <b>{h}:</b> {t}
          </li>
        ))}
      </ul>
      <section className="policy-contact">
        <h2>Contact Us</h2>
        <p>
          <b>Business Name:</b> {brand.name}
          <br />
          <b>Address:</b> {address}
          <br />
          <b>WhatsApp / Phone:</b> {whatsapp}
          <br />
          <b>Email:</b> {email}
        </p>
      </section>
      <nav className="policy-nav" aria-label="Store policies">
        {policyLinks
          .filter(([href]) => href !== path)
          .map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
      </nav>
    </main>
  );
}
