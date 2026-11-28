import { brand } from "../config.js";
import { policyLinks } from "./PolicyPage.jsx";

export default function Footer() {
  const { address, whatsapp, email } = brand.business;
  return (
    <footer id="contact">
      <div className="wrap g">
        <div>
          <p
            className="serif"
            style={{
              fontSize: 22,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <img
              src="/images/logo.png"
              alt=""
              width="56"
              height="56"
              style={{ width: 56, height: 56, borderRadius: "50%" }}
            />
            {brand.name}
          </p>
          <p>{brand.tagline}</p>
          <small>{brand.disclaimer}</small>
        </div>
        <div className="footer-contact">
          <b>Contact Us</b>
          <p>
            <span>Address:</span> {address}
          </p>
          <p>
            <span>WhatsApp:</span>{" "}
            <a href={`https://wa.me/92${whatsapp.slice(1)}`}>{whatsapp}</a>
          </p>
          <p>
            <span>Email:</span> <a href={`mailto:${email}`}>{email}</a>
          </p>
        </div>
        <div className="footer-links">
          <b>Quick Links</b>
          {policyLinks.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </div>
      </div>
      <div className="cr">
        © {new Date().getFullYear()} {brand.name}. All rights reserved.
      </div>
    </footer>
  );
}
