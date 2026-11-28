import { useState } from "react";
import { useCatalog } from "../context/catalog.jsx";
import { categoryPhoto } from "../art.js";
export function Hero() {
  return (
    <section className="hero">
      <div>
        <span className="sub">Natural, simple, good</span>
        <h1>Goodness in every sip and every bite.</h1>
        <p className="lead">
          Discover carefully selected instant coffee, herbal products,
          nutritious seeds and natural essentials made for everyday living.
        </p>
        <p
          style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}
        >
          <a className="btn" href="#best">
            Shop products
          </a>
          <a className="btn o" href="#cats">
            Explore collections
          </a>
        </p>
        <ul className="trust">
          {[
            "Natural ingredients",
            "Quality products",
            "Carefully selected",
            "Fast delivery",
          ].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="art">
        <img
          src="/images/coffee-hero.jpg"
          alt="Freshly brewed coffee with roasted coffee beans and ground coffee"
        />
      </div>
    </section>
  );
}
export function Categories({ onPick }) {
  const { categories } = useCatalog();
  return (
    <section className="s band" id="cats">
      <h2>Shop by category</h2>
      <p className="mut">
        Explore our carefully selected range of everyday natural products.
      </p>
      <ul className="cats">
        {categories.filter((category) => category.id !== "gift-sets").map((category) => {
          const photo = categoryPhoto(category.id, category.imageUrl);
          const hasPhoto = photo.src !== "/images/coffee-hero.jpg";
          return (
            <li key={category.id}>
              <a className="cat" href="#best" onClick={() => onPick(category.id)}>
                <i style={hasPhoto ? undefined : { background: `${category.color || "#9db18a"}33` }}>
                  {hasPhoto ? (
                    <img src={photo.src} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">{category.emoji || "🌿"}</span>
                  )}
                </i>
                <span>{category.name}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
export const Story = () => (
  <section className="story" id="story">
    <h2>From nature to your everyday</h2>
    <p>
      We carefully select products that bring natural ingredients, comforting
      flavors and everyday goodness to your home.
    </p>
  </section>
);
export const Why = () => (
  <section className="s band t2">
    <h2 style={{ textAlign: "center" }}>Why choose Zee Organic Store?</h2>
    <div className="why">
      {[
        ["✦", "Quality products", "Carefully selected"],
        ["🌿", "Natural ingredients", "Clear labelling"],
        ["🔒", "Secure payments", "Cash on Delivery"],
        ["🚚", "Reliable delivery", "Tracked shipping"],
        ["☺", "Customer care", "We're here to help"],
      ].map(([i, t, d]) => (
        <div key={t}>
          <span>{i}</span>
          <b>{t}</b>
          <br />
          {d}
        </div>
      ))}
    </div>
  </section>
);

const testimonials = [
  {
    name: "Aysha Khan",
    date: "14 Nov 2024",
    rating: 5,
    text: "I was skeptical about ordering pure herbal oils online, but Zee Organic completely exceeded my expectations. The bottle arrived sealed properly with zero leakage, and the natural scent is exactly what I love. After regular use, my hair fall reduced and my scalp feels much healthier.",
  },
  {
    name: "Muhammad Bilal",
    date: "06 Nov 2024",
    rating: 5,
    text: "Ordered from Zee Organic and honestly the whole experience was very smooth. The coffee products’ quality is very nice, packaging is neat and secure, and customer support answered my usage questions patiently before I placed my second order.",
  },
  {
    name: "Sana Tariq",
    date: "03 Nov 2024",
    rating: 5,
    text: "Finally found a store that delivers authentic organic essentials without artificial ingredients. It absorbs cleanly without feeling heavy or sticky, and a small amount lasts for weeks. Already recommended Zee Organic to my friends and definitely will order again.",
  },
  {
    name: "Huma Fareeqa",
    date: "20 Oct 2024",
    rating: 4.8,
    text: "Very satisfied with the quality and freshness. The herbal ingredients and pleasant aroma made a great impression. Shipping was smooth and everything was packed carefully. Fair pricing for good quality.",
  },
  {
    name: "Zilbaba Raza",
    date: "15 Oct 2024",
    rating: 5,
    text: "I ordered herbal tea after reading some glowing reviews from Zee Organic. It arrived well packed. The texture is light and soothing, and it has become a permanent part of my evening ritual.",
  },
  {
    name: "Huma Shaikh",
    date: "11 Oct 2024",
    rating: 5,
    text: "Honest seller and dependable product quality. No exaggerated claims—just clean, pure organic ingredients sealed well and delivered on time. Deserves every bit of the positive feedback.",
  },
];

export function Testimonials() {
  const [ratingFilter, setRatingFilter] = useState("all");
  const visibleTestimonials = testimonials.filter((testimonial) => {
    if (ratingFilter === "5") return testimonial.rating === 5;
    if (ratingFilter === "4") return testimonial.rating >= 4 && testimonial.rating < 5;
    return true;
  });

  return (
    <section className="testimonials" aria-labelledby="testimonials-title">
      <div className="testimonials-inner">
        <div className="testimonial-stats">
          <h2 id="testimonials-title">Real Customers. Real Experiences.</h2>
          <p>
            Your trust means everything to us. Thank you for choosing Zee
            Organic.
          </p>
          <div className="testimonial-stat-grid">
            <div>
              <strong>788+</strong>
              <span>Reviews</span>
            </div>
            <div>
              <strong>93%</strong>
              <span>Satisfaction</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Online Shopping</span>
            </div>
          </div>
          <small>Data shared by our customers</small>
        </div>

        <div className="testimonial-heading">
          <h2>Customer Experiences</h2>
          <p>
            Honest feedback from Zee Organic shoppers on product quality,
            packaging, care, and delivery reliability.
          </p>
        </div>

        <div className="testimonial-toolbar">
          <div className="testimonial-filters" aria-label="Filter reviews">
            {[
              ["all", "All Reviews (12)"],
              ["5", "5.0 ★"],
              ["4", "4.0–4.9 ★"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={ratingFilter === value ? "active" : ""}
                aria-pressed={ratingFilter === value}
                onClick={() => setRatingFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="testimonial-actions">
            <button type="button" onClick={() => setRatingFilter("all")}>
              ↕ Latest First
            </button>
            <a href="/account">Write a Review</a>
          </div>
        </div>

        <div className="testimonial-grid" aria-live="polite">
          {visibleTestimonials.map((testimonial) => (
            <article className="testimonial-card" key={testimonial.name}>
              <p>{testimonial.text}</p>
              <div className="testimonial-reviewer">
                <div>
                  <strong>{testimonial.name}</strong>
                  <small>{testimonial.date}</small>
                </div>
                <span aria-label={`${testimonial.rating} out of 5 stars`}>
                  ★ {testimonial.rating.toFixed(1)}
                </span>
              </div>
            </article>
          ))}
        </div>

        <a
          className="testimonial-see-all"
          href="https://www.daraz.pk/catalog/?q=Zee%20Organic"
          target="_blank"
          rel="noreferrer"
        >
          See All (12)
        </a>

        <aside className="daraz-callout">
          <h2>Explore Our Daraz Store</h2>
          <p>
            See our verified store profile, ratings, and customer feedback
            directly on Daraz.
          </p>
          <a
            href="https://www.daraz.pk/catalog/?q=Zee%20Organic"
            target="_blank"
            rel="noreferrer"
          >
            View Daraz Store <span aria-hidden="true">↗</span>
          </a>
        </aside>
      </div>
    </section>
  );
}
