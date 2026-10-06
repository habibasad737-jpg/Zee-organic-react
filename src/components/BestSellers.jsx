import { useState } from "react";
import { useCatalog } from "../context/catalog.jsx";
import ProductCard from "./ProductCard.jsx";
export default function BestSellers({ q, setQ }) {
  const { products } = useCatalog();
  const [sort, setSort] = useState("f"),
    s = q.toLowerCase().trim();
  const source = s ? products : products.slice(0, 8);
  const list = source
    .filter((p) => {
      const text = `${p.n} ${p.d} ${p.cat}`.toLowerCase();
      const normalized = s.replace(/[^a-z0-9]/g, "");
      const categoryMatch = p.cat
        .toLowerCase()
        .replace(/-/g, "")
        .includes(normalized);
      return !s || text.includes(s) || categoryMatch;
    })
    .sort((a, b) =>
      sort === "l"
        ? a.p - b.p
        : sort === "h"
          ? b.p - a.p
          : sort === "r"
            ? b.r - a.r
            : 0,
    );
  const f = {
    minHeight: 44,
    border: "1px solid var(--sand)",
    borderRadius: 999,
    padding: "0 16px",
    background: "var(--card)",
    color: "var(--ink)",
    font: "inherit",
  };
  return (
    <section className="s" id="best">
      <div className="head">
        <div>
          <h2>Our Products</h2>
          <p className="mut">
            Customer favorites, carefully selected for better everyday living.
          </p>
        </div>
        <a
          href="/shop"
          onClick={() => setQ("")}
          style={{ fontSize: 14, flexShrink: 0 }}
        >
          View all products
        </a>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <label className="sr" htmlFor="q">
          Search products
        </label>
        <input
          id="q"
          type="search"
          placeholder="Search coffee, seeds, herbal…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...f, flex: "1 1 220px" }}
        />
        <label className="sr" htmlFor="so">
          Sort
        </label>
        <select
          id="so"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={f}
        >
          <option value="f">Featured</option>
          <option value="l">Price: low to high</option>
          <option value="h">Price: high to low</option>
          <option value="r">Rating</option>
        </select>
      </div>
      <div className="grid" aria-live="polite">
        {list.length ? (
          list.map((p) => <ProductCard key={p.id} p={p} />)
        ) : (
          <p>No products found. Try a different search.</p>
        )}
      </div>
    </section>
  );
}
