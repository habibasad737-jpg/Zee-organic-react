import { useState } from "react";
import { CartProvider } from "./context/cart.jsx";
import { AuthProvider } from "./context/auth.jsx";
import { WishlistProvider } from "./context/wishlist.jsx";
import Header from "./components/Header.jsx";
import BestSellers from "./components/BestSellers.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import Newsletter from "./components/Newsletter.jsx";
import Footer from "./components/Footer.jsx";
import ShopPage from "./components/ShopPage.jsx";
import ProductPage from "./components/ProductPage.jsx";
import AccountPage from "./components/AccountPage.jsx";
import { P } from "./data.js";
import { Hero, Categories, Story, Why } from "./components/Sections.jsx";
export default function App() {
  const [q, setQ] = useState("");
  const path = window.location.pathname.replace(/\/+$/, "");
  const isShopPage = path === "/shop";
  const isAccountPage = path === "/account";
  const productId = path.startsWith("/product/")
    ? decodeURIComponent(path.slice("/product/".length))
    : "";
  const product = P.find((item) => item.id === productId);
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <Header />
          {product ? (
            <ProductPage product={product} />
          ) : isShopPage ? (
            <ShopPage />
          ) : isAccountPage ? (
            <AccountPage />
          ) : path.startsWith("/product/") ? (
            <main className="product-not-found wrap">
              <h1>Product not found</h1>
              <p>
                This product may have been removed or is no longer available.
              </p>
              <a className="btn" href="/shop">
                Browse all products
              </a>
            </main>
          ) : (
            <main id="top">
              <div className="wrap">
                <Hero />
                <Categories onPick={setQ} />
                <BestSellers q={q} setQ={setQ} />
                <Story />
                <Why />
                <Newsletter />
              </div>
            </main>
          )}
          <Footer />
          <CartDrawer />
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
