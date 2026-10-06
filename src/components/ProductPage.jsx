import { useCallback, useState } from "react";
import { productPhoto } from "../art.js";
import { money } from "../config.js";
import { useCatalog } from "../context/catalog.jsx";
import { useCart } from "../context/cart.jsx";
import { useAuth } from "../context/auth.jsx";
import ProductCard from "./ProductCard.jsx";
import SignInModal from "./SignInModal.jsx";

export default function ProductPage({ product }) {
  const { categories, products } = useCatalog();
  const { change, setOpen } = useCart();
  const { user } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);
  const categoryName =
    categories.find((item) => item.id === product.cat)?.name ||
    "Organic essentials";
  const relatedProducts = products.filter(
    (item) => item.cat === product.cat && item.id !== product.id,
  ).slice(0, 4);
  const discount = product.o
    ? Math.round((1 - product.p / product.o) * 100)
    : 0;
  const image = productPhoto(product);

  const addToCart = useCallback(() => {
    change(product.id, 1);
    setOpen(true);
  }, [change, product.id, setOpen]);

  const buyNow = () => {
    if (user) {
      addToCart();
      return;
    }
    setSignInOpen(true);
  };

  const signInAndContinue = () => {
    closeSignIn();
    addToCart();
  };

  return (
    <main className="product-page">
      <div className="wrap">
        <nav className="product-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <a href="/shop">Shop</a>
          <span aria-hidden="true">/</span>
          <a
            href={`/shop?category=${encodeURIComponent(product.cat)}#products`}
          >
            {categoryName}
          </a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.n}</span>
        </nav>

        <section className="product-detail">
          <div className="product-detail-art">
            <img src={image.src} alt={image.alt} />
          </div>

          <div className="product-detail-info">
            <p className="product-category">{categoryName}</p>
            <h1>{product.n}</h1>
            {product.b && (
              <span className="product-detail-tag">{product.b}</span>
            )}

            <a className="product-rating-link" href="#reviews">
              <span aria-label={`${product.r} out of 5 stars`}>
                {"★".repeat(Math.round(product.r))}
              </span>
              <b>{product.r.toFixed(1)}</b>
              <span>({product.v} ratings)</span>
            </a>

            <p className="product-detail-description">{product.d}</p>
            <p className="product-detail-description">
              Part of our {categoryName.toLowerCase()} collection,
              selected to bring natural ingredients and everyday flavor to your
              home.
            </p>

            <div className="product-detail-price">
              <strong>{money(product.p)}</strong>
              {discount > 0 && (
                <>
                  <s>{money(product.o)}</s>
                  <span>{discount}% off</span>
                </>
              )}
            </div>
            <p className="product-weight">Pack size: {product.w}</p>
            <p
              className={product.s > 0 ? "product-stock" : "product-stock out"}
            >
              {product.s > 0 ? "In stock" : "Currently unavailable"}
            </p>

            <div className="product-actions">
              <button
                className="btn"
                type="button"
                disabled={!product.s}
                onClick={addToCart}
              >
                Add to cart
              </button>
              <button
                className="btn product-buy-now"
                type="button"
                disabled={!product.s}
                onClick={buyNow}
              >
                Buy now
              </button>
            </div>
            <p className="product-buy-note">
              {user
                ? "Your account is signed in. Buy now adds this item to your cart."
                : "Sign in or create an account to continue with Buy now."}
            </p>

            <div className="product-details-list">
              <h2>Product details</h2>
              <dl>
                <div>
                  <dt>Category</dt>
                  <dd>{categoryName}</dd>
                </div>
                <div>
                  <dt>Pack size</dt>
                  <dd>{product.w}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{product.d}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="product-reviews" id="reviews">
          <div className="product-reviews-heading">
            <div>
              <p className="product-category">Customer feedback</p>
              <h2>Reviews for {product.n}</h2>
            </div>
            <div className="product-review-summary">
              <strong>{product.r.toFixed(1)}</strong>
              <span aria-label={`${product.r} out of 5 stars`}>
                {"★".repeat(Math.round(product.r))}
              </span>
              <small>{product.v} ratings</small>
            </div>
          </div>
          <p className="product-review-note">
            Rating information is demo data. Verified customer reviews will
            appear here when available.
          </p>
          <div className="product-review-empty">
            <span aria-hidden="true">✦</span>
            <h3>Reviews are on their way</h3>
            <p>
              We don’t have verified written reviews for this product yet. Check
              back after customers have shared their experience.
            </p>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="related-products">
            <h2>You may also like</h2>
            <p className="mut">More from {categoryName}.</p>
            <div className="grid">
              {relatedProducts.map((item) => (
                <ProductCard key={item.id} p={item} />
              ))}
            </div>
          </section>
        )}
      </div>
      <SignInModal
        open={signInOpen}
        onClose={closeSignIn}
        onSuccess={signInAndContinue}
      />
    </main>
  );
}
