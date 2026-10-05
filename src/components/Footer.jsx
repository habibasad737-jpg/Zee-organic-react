import { brand } from "../config.js";
export default function Footer() {
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
          <p>{brand.tagline}.</p>
        </div>
        <div>
          <b>Contact</b>
          {brand.contact.map((x) => (
            <span key={x}>
              <br />
              {x}
            </span>
          ))}
        </div>
        <div>
          <small>{brand.disclaimer}</small>
        </div>
      </div>
      <div className="cr">
        © {new Date().getFullYear()} {brand.name} · Demo: checkout, payments and
        newsletter are placeholders
      </div>
    </footer>
  );
}
