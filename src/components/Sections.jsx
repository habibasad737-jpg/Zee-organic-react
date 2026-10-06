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
        ["🔒", "Secure payments", "Gateway placeholder"],
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
