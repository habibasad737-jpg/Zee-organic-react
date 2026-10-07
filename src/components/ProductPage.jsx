import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { productPhoto } from "../art.js";
import { money } from "../config.js";
import { db } from "../firebase.js";
import { useCatalog } from "../context/catalog.jsx";
import { useCart } from "../context/cart.jsx";
import { useAuth } from "../context/auth.jsx";
import ProductCard from "./ProductCard.jsx";
import SignInModal from "./SignInModal.jsx";

const formatReviewDate = (createdAt) => {
  const date = createdAt?.toDate?.() || createdAt;
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)
    : "";
};

export default function ProductPage({ product }) {
  const { categories, products } = useCatalog();
  const { change, setOpen } = useCart();
  const { user } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
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
  const averageRating = customerReviews.length
    ? customerReviews.reduce((sum, review) => sum + review.rating, 0) /
      customerReviews.length
    : 0;

  useEffect(() => {
    let active = true;
    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError("");
      setCustomerReviews([]);
      try {
        const reviewsQuery = query(
          collection(db, "reviews"),
          where("productId", "==", product.id),
        );
        const snapshot = await getDocs(reviewsQuery);
        if (!active) return;
        const list = snapshot.docs.map((reviewDoc) => ({
          id: reviewDoc.id,
          ...reviewDoc.data(),
        }));
        list.sort(
          (first, second) =>
            (second.createdAt?.toMillis?.() ?? 0) -
            (first.createdAt?.toMillis?.() ?? 0),
        );
        setCustomerReviews(list);
      } catch (loadError) {
        console.error("Unable to load product reviews.", loadError);
        if (active) {
          setReviewsError("We couldn't load customer reviews right now.");
        }
      } finally {
        if (active) setReviewsLoading(false);
      }
    };
    loadReviews();
    return () => {
      active = false;
    };
  }, [product.id]);

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
              <p className="product-category">Verified customer feedback</p>
              <h2>Reviews for {product.n}</h2>
            </div>
            <div className="product-review-summary">
              <strong>{customerReviews.length ? averageRating.toFixed(1) : "—"}</strong>
              <span aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>
                {"★".repeat(Math.round(averageRating))}
              </span>
              <small>
                {customerReviews.length} verified review
                {customerReviews.length === 1 ? "" : "s"}
              </small>
            </div>
          </div>
          <p className="product-review-note">
            Only customers with a delivered order can submit a review.
          </p>
          {reviewsLoading ? (
            <p>Loading customer reviews...</p>
          ) : reviewsError ? (
            <p role="status">{reviewsError}</p>
          ) : customerReviews.length ? (
            <div className="product-review-list">
              {customerReviews.map((review) => (
                <article className="product-review-card" key={review.id}>
                  <div className="product-review-card-heading">
                    <strong>{review.userName || "Verified customer"}</strong>
                    <span>
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                    {formatReviewDate(review.createdAt) && (
                      <small>{formatReviewDate(review.createdAt)}</small>
                    )}
                  </div>
                  <p>{review.comment}</p>
                  <small>Verified purchase</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="product-review-empty">
              <span aria-hidden="true">✦</span>
              <h3>No customer reviews yet</h3>
              <p>Verified customer reviews will appear here after delivery.</p>
            </div>
          )}
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
