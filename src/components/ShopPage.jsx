import { useMemo, useState } from "react";
import { C, P } from "../data.js";
import ProductCard from "./ProductCard.jsx";

const searchParams = new URLSearchParams(window.location.search);
const initialCategory = searchParams.get("category") || "all";
const initialSearch = searchParams.get("q") || "";

export default function ShopPage() {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialSearch);
  const [sort, setSort] = useState("featured");

  const products = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return P.filter((product) => {
      const matchesCategory = category === "all" || product.cat === category;
      const matchesQuery =
        !normalizedQuery ||
        `${product.n} ${product.d} ${product.cat}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    }).sort((a, b) => {
      if (sort === "price-low") return a.p - b.p;
      if (sort === "price-high") return b.p - a.p;
      if (sort === "rating") return b.r - a.r;
      if (sort === "name") return a.n.localeCompare(b.n);
      return 0;
    });
  }, [category, query, sort]);

  return (
    <main className="shop-page" id="top">
      <section className="shop-intro">
        <div className="wrap">
          <p className="shop-eyebrow">The Zee Organic collection</p>
          <h1>Shop all products</h1>
          <p>
            Explore our complete range of coffee, herbal favorites, pantry
            essentials and thoughtful gift sets.
          </p>
          <span className="shop-count">{P.length} products to explore</span>
        </div>
      </section>

      <section className="wrap shop-catalog" id="products">
        <div className="shop-tools">
          <label className="sr" htmlFor="shop-search">
            Search products
          </label>
          <input
            id="shop-search"
            type="search"
            placeholder="Search products..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="sr" htmlFor="shop-sort">
            Sort products
          </label>
          <select
            id="shop-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="rating">Highest rated</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>

        <nav
          className="shop-categories"
          aria-label="Filter products by category"
        >
          <button
            className={category === "all" ? "active" : ""}
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            All products
          </button>
          {C.map(([name, , , categoryId]) => (
            <button
              className={category === categoryId ? "active" : ""}
              aria-pressed={category === categoryId}
              key={categoryId}
              onClick={() => setCategory(categoryId)}
            >
              {name}
            </button>
          ))}
        </nav>

        <div className="shop-results">
          <p aria-live="polite">
            Showing <strong>{products.length}</strong>{" "}
            {products.length === 1 ? "product" : "products"}
          </p>
          <div className="grid">
            {products.length ? (
              products.map((product) => (
                <ProductCard key={product.id} p={product} />
              ))
            ) : (
              <p className="shop-empty">
                No products found. Try a different search or category.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
