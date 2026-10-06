import { useEffect, useState } from "react";
import { brand } from "../config.js";
import { useCart } from "../context/cart.jsx";
import { useAuth } from "../context/auth.jsx";
const nav = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["Categories", "/#cats"],
  ["About Us", "/#story"],
  ["Contact", "/#contact"],
];
export default function Header() {
  const [menu, setMenu] = useState(false),
    [stuck, setStuck] = useState(false),
    [hidden, setHidden] = useState(false),
    c = useCart();
  const { user } = useAuth();
  const isShopPage = window.location.pathname.replace(/\/+$/, "") === "/shop";
  useEffect(() => {
    let previousY = window.scrollY;
    const f = () => {
      const currentY = window.scrollY;
      setStuck(currentY > 40);
      if (
        !window.matchMedia("(max-width: 767px)").matches ||
        currentY <= 40 ||
        menu
      ) {
        setHidden(false);
      } else if (Math.abs(currentY - previousY) >= 3) {
        setHidden(currentY > previousY && currentY > 120);
      }
      previousY = currentY;
    };
    f();
    addEventListener("scroll", f, { passive: true });
    return () => removeEventListener("scroll", f);
  }, [menu]);
  return (
    <>
      <header
        id="hd"
        className={`${stuck ? "stuck" : ""}${hidden ? " header-hidden" : ""}`}
      >
        <div className="wrap">
          <div className="bar">
            <a
              className="logo serif"
              href="/"
              aria-label={`${brand.name} home`}
            >
              <img
                src="/images/logo.png"
                alt=""
                width="46"
                height="46"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  flex: "none",
                }}
              />
              <span>{brand.name}</span>
            </a>
            <nav className="d" aria-label="Main">
              {nav.map(([n, h]) => (
                <a
                  key={n}
                  href={h}
                  aria-current={
                    (n === "Shop" && isShopPage) ||
                    (n === "Home" && !isShopPage)
                      ? "page"
                      : undefined
                  }
                >
                  {n}
                </a>
              ))}
            </nav>
            <div className="header-actions">
              <a
                className="header-action"
                href="/shop#products"
                aria-label="Search products"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4.2 4.2" />
                </svg>
              </a>
              <button
                className="header-action"
                onClick={() => c.setOpen(true)}
                aria-label={`Open cart, ${c.count} items`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="21"
                  height="21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6" />
                  <circle cx="10" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                </svg>
                {c.count > 0 && <span className="badge">{c.count}</span>}
              </button>
              <a
                className="account-link"
                href={user ? "/account" : "/account?signin=1"}
              >
                {user ? "My account" : "Sign in"}
              </a>
              <button
                className="ic"
                id="hb"
                onClick={() => setMenu(!menu)}
                aria-expanded={menu}
                aria-label={menu ? "Close menu" : "Open menu"}
              >
                {menu ? "✕" : "☰"}
              </button>
            </div>
          </div>
        </div>
        <nav id="mm" className={menu ? "open" : ""} aria-label="Mobile">
          {nav.map(([n, h]) => (
            <a
              key={n}
              href={h}
              aria-current={
                (n === "Shop" && isShopPage) || (n === "Home" && !isShopPage)
                  ? "page"
                  : undefined
              }
              onClick={() => setMenu(false)}
            >
              {n}
            </a>
          ))}
        </nav>
      </header>
    </>
  );
}
