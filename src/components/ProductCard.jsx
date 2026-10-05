import { productPhoto } from "../art.js";
import { money } from "../config.js";
import { useCart } from "../context/cart.jsx";
import { useWishlist } from "../context/wishlist.jsx";
export default function ProductCard({ p }) {
  const { change, setOpen } = useCart();
  const { ids, toggle, ready } = useWishlist();
  const fav = ids.includes(p.id);
  const d = p.o ? Math.round((1 - p.p / p.o) * 100) : 0;
  const image = productPhoto(p);

  return (
    <article className="card">
      {p.b && <span className="tag">{p.b}</span>}
      <a className="product-link" href={`/product/${encodeURIComponent(p.id)}`}>
        <div className="ph">
          <img src={image.src} alt={image.alt} loading="lazy" />
        </div>
        <h3>{p.n}</h3>
        <p className="d">{p.d}</p>
      </a>
      <p className="d rating">
        ★ {p.r} <span>({p.v} reviews, demo)</span>
      </p>
      <div className="card-purchase">
        <div className="row">
          <span className="price">
            <b>{money(p.p)}</b>
            {d > 0 && (
              <span className="price-details">
                <s>{money(p.o)}</s>
                <em>{d}% off</em>
              </span>
            )}
          </span>
          <div className="card-actions">
            <button
              className="heart"
              type="button"
              aria-pressed={fav}
              aria-label={`${fav ? "Remove" : "Save"} ${p.n} ${fav ? "from" : "to"} wishlist`}
              disabled={!ready}
              onClick={() => toggle(p.id)}
            >
              {fav ? "♥" : "♡"}
            </button>
            <button
              className="add"
              type="button"
              disabled={!p.s}
              aria-label={p.s ? `Add ${p.n} to cart` : "Out of stock"}
              onClick={() => {
                change(p.id, 1);
                setOpen(true);
              }}
            >
              +
            </button>
          </div>
        </div>
        <p className="stock-note" aria-hidden={Boolean(p.s)}>
          {p.s ? "\u00a0" : "Out of stock"}
        </p>
      </div>
    </article>
  );
}
