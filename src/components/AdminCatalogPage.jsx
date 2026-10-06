import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "../context/catalog.jsx";

const emptyProduct = {
  n: "",
  d: "",
  cat: "",
  p: "",
  o: "",
  s: "0",
  w: "",
  b: "",
  imageUrl: "",
};
const emptyCategory = {
  name: "",
  color: "#9db18a",
  emoji: "🌿",
  imageUrl: "",
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const money = (amount) =>
  `PKR ${Number(amount || 0).toLocaleString()}`;

function imageSource(product) {
  if (product.imageUrl) return product.imageUrl;
  return `/images/products/${product.id}.jpg`;
}

export default function AdminCatalogPage() {
  const {
    products,
    categories,
    catalogLoading,
    catalogExists,
    catalogError,
    saveCatalog,
    initializeCatalog,
  } = useCatalog();
  const [tab, setTab] = useState("products");
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    initializeCatalog()
      .catch((initializeError) => {
        console.error("Unable to initialize the editable product catalog.", initializeError);
        if (active) {
          setError(
            initializeError.code === "permission-denied"
              ? "Firebase denied catalog access. Add the catalog rule described in README.md."
              : initializeError.message || "Unable to initialize the catalog.",
          );
        }
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, [initializeCatalog]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      `${product.n} ${product.id} ${product.cat}`
        .toLowerCase()
        .includes(term),
    );
  }, [products, search]);

  const commitCatalog = async (nextProducts, nextCategories, successMessage) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await saveCatalog({
        products: nextProducts,
        categories: nextCategories,
      });
      setNotice(successMessage);
      return true;
    } catch (saveError) {
      console.error("Unable to save catalog changes.", saveError);
      setError(
        saveError.code === "permission-denied"
          ? "Firebase denied catalog access. Add the catalog rule described in README.md."
          : saveError.message || "Unable to save catalog changes.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (busy || !editingProduct) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const categoryId = String(form.get("category") || "");
    const price = Number(form.get("price"));
    const stock = Number(form.get("stock"));
    const size = String(form.get("size") || "").trim();
    if (!name || !categoryId || !size || !Number.isFinite(price) || price <= 0 ||
      !Number.isInteger(stock) || stock < 0) {
      setError("Enter a name, category, size, positive price, and a whole-number stock quantity of zero or more.");
      return;
    }

    const editedId = editingProduct.id;
    let id = editedId || slugify(name);
    if (!id) {
      setError("Use a product name containing letters or numbers.");
      return;
    }
    if (!editedId && products.some((product) => product.id === id)) {
      let suffix = 2;
      while (products.some((product) => product.id === `${id}-${suffix}`)) suffix += 1;
      id = `${id}-${suffix}`;
    }
    const originalPrice = Number(form.get("originalPrice"));
    const nextProduct = {
      ...(products.find((product) => product.id === editedId) || {}),
      id,
      n: name,
      d: String(form.get("description") || "").trim(),
      cat: categoryId,
      p: price,
      r: Number(products.find((product) => product.id === editedId)?.r || 0),
      v: Number(products.find((product) => product.id === editedId)?.v || 0),
      ...(Number.isFinite(originalPrice) && originalPrice > price
        ? { o: originalPrice }
        : { o: undefined }),
      s: stock,
      w: size,
      ...(String(form.get("badge") || "").trim()
        ? { b: String(form.get("badge")).trim() }
        : { b: undefined }),
      ...(String(form.get("imageUrl") || "").trim()
        ? { imageUrl: String(form.get("imageUrl")).trim() }
        : { imageUrl: undefined }),
    };
    const savedProduct = Object.fromEntries(
      Object.entries(nextProduct).filter(([, value]) => value !== undefined),
    );
    const nextProducts = editedId
      ? products.map((product) => (product.id === editedId ? savedProduct : product))
      : [...products, savedProduct];
    const saved = await commitCatalog(
      nextProducts,
      categories,
      `${name} ${editedId ? "updated" : "added"}.`,
    );
    if (saved) setEditingProduct(null);
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    if (busy || !editingCategory) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) {
      setError("Enter a category name.");
      return;
    }
    const id = editingCategory.id || slugify(name);
    if (!id) {
      setError("Use a category name containing letters or numbers.");
      return;
    }
    if (categories.some((category) => category.id === id && id !== editingCategory.id)) {
      setError("A category with this name already exists.");
      return;
    }
    const nextCategory = {
      id,
      name,
      color: String(form.get("color") || "#9db18a"),
      emoji: String(form.get("emoji") || "").trim(),
      imageUrl: String(form.get("imageUrl") || "").trim(),
    };
    const nextCategories = editingCategory.id
      ? categories.map((category) =>
          category.id === editingCategory.id ? nextCategory : category,
        )
      : [...categories, nextCategory];
    const saved = await commitCatalog(
      products,
      nextCategories,
      `${name} ${editingCategory.id ? "updated" : "added"}.`,
    );
    if (saved) setEditingCategory(null);
  };

  const deleteProduct = async (product) => {
    if (busy || !window.confirm(`Remove “${product.n}” from the catalog?`)) return;
    await commitCatalog(
      products.filter((item) => item.id !== product.id),
      categories,
      `${product.n} removed.`,
    );
  };

  const deleteCategory = async (category) => {
    if (busy) return;
    if (products.some((product) => product.cat === category.id)) {
      setError("Move or remove this category’s products before deleting the category.");
      return;
    }
    if (!window.confirm(`Remove the “${category.name}” category?`)) return;
    await commitCatalog(
      products,
      categories.filter((item) => item.id !== category.id),
      `${category.name} removed.`,
    );
  };

  if (catalogLoading || initializing) {
    return <div className="admin-empty">Loading your editable catalog…</div>;
  }

  return (
    <section className="admin-panel admin-catalog-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Catalog management</h2>
          <p>Changes are saved to your store and appear on the existing storefront.</p>
        </div>
        <span className="admin-catalog-save-state">
          {catalogExists ? "Synced with storefront" : "Using starter catalog"}
        </span>
      </div>

      {(catalogError || error) && (
        <div className="admin-alert" role="alert">{error || catalogError}</div>
      )}
      {notice && <div className="admin-notice" role="status">{notice}</div>}

      <div className="admin-catalog-tabs" role="tablist" aria-label="Catalog items">
        <button
          role="tab"
          aria-selected={tab === "products"}
          className={tab === "products" ? "active" : ""}
          onClick={() => { setTab("products"); setError(""); }}
        >
          Products <b>{products.length}</b>
        </button>
        <button
          role="tab"
          aria-selected={tab === "categories"}
          className={tab === "categories" ? "active" : ""}
          onClick={() => { setTab("categories"); setError(""); }}
        >
          Categories <b>{categories.length}</b>
        </button>
      </div>

      {tab === "products" ? (
        <>
          <div className="admin-catalog-toolbar">
            <label className="admin-search">
              <span>⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products…"
              />
            </label>
            <button
              className="admin-primary-button"
              onClick={() => { setError(""); setEditingProduct({ ...emptyProduct }); }}
            >
              + Add product
            </button>
          </div>
          <div className="admin-catalog-grid">
            {visibleProducts.map((product) => {
              const category = categories.find((item) => item.id === product.cat);
              return (
                <article className="admin-product-card" key={product.id}>
                  <img
                    src={imageSource(product)}
                    alt=""
                    onError={(event) => { event.currentTarget.src = "/images/logo.png"; }}
                  />
                  <div className="admin-product-info">
                    <span className="admin-eyebrow">{category?.name || "Uncategorised"}</span>
                    <h3>{product.n}</h3>
                    <p>{money(product.p)} <span>· {product.w || "Size not set"}</span></p>
                    <div className="admin-product-meta">
                      <span className={Number(product.s) > 0 ? "in-stock" : "out-stock"}>
                        {Number(product.s) > 0 ? `${product.s} in stock` : "Out of stock"}
                      </span>
                      {product.b && <span className="admin-product-badge">{product.b}</span>}
                    </div>
                  </div>
                  <div className="admin-product-actions">
                    <button onClick={() => { setError(""); setEditingProduct(product); }}>Edit</button>
                    <button className="danger" onClick={() => deleteProduct(product)} disabled={busy}>Delete</button>
                  </div>
                </article>
              );
            })}
            {!visibleProducts.length && (
              <div className="admin-empty">
                {products.length ? "No products match your search." : "No products yet. Add your first product."}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="admin-catalog-toolbar">
            <span className="admin-catalog-hint">Categories with products can’t be deleted.</span>
            <button
              className="admin-primary-button"
              onClick={() => { setError(""); setEditingCategory({ ...emptyCategory }); }}
            >
              + Add category
            </button>
          </div>
          <div className="admin-category-grid">
            {categories.map((category) => {
              const productCount = products.filter((product) => product.cat === category.id).length;
              return (
                <article className="admin-category-card" key={category.id}>
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt="" />
                  ) : (
                    <span className="admin-category-emoji" style={{ background: `${category.color || "#9db18a"}22` }}>
                      {category.emoji || "🌿"}
                    </span>
                  )}
                  <div>
                    <h3>{category.name}</h3>
                    <p>{productCount} {productCount === 1 ? "product" : "products"}</p>
                  </div>
                  <div className="admin-product-actions">
                    <button onClick={() => { setError(""); setEditingCategory(category); }}>Edit</button>
                    <button className="danger" onClick={() => deleteCategory(category)} disabled={busy}>Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {editingProduct && (
        <div className="admin-modal-backdrop" onClick={() => setEditingProduct(null)}>
          <form
            className="admin-editor-modal"
            onSubmit={saveProduct}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-editor-heading">
              <div>
                <span className="admin-eyebrow">PRODUCT CATALOG</span>
                <h2>{editingProduct.id ? "Edit product" : "Add product"}</h2>
              </div>
              <button type="button" className="admin-close-button" aria-label="Close" onClick={() => setEditingProduct(null)}>×</button>
            </div>
            <div className="admin-editor-fields">
              <label className="wide">Product name
                <input name="name" required defaultValue={editingProduct.n} />
              </label>
              <label className="wide">Description
                <textarea name="description" rows="3" defaultValue={editingProduct.d} />
              </label>
              <label>Category
                <select name="category" required defaultValue={editingProduct.cat || categories[0]?.id || ""}>
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label>Price (PKR)
                <input name="price" type="number" min="1" step="1" required defaultValue={editingProduct.p} />
              </label>
              <label>Compare-at price (optional)
                <input name="originalPrice" type="number" min="0" step="1" defaultValue={editingProduct.o || ""} />
              </label>
              <label>Stock quantity
                <input name="stock" type="number" min="0" step="1" required defaultValue={editingProduct.s ?? 0} />
              </label>
              <label>Size / pack weight
                <input name="size" placeholder="e.g. 250g, 500ml, 2 pieces" required defaultValue={editingProduct.w} />
              </label>
              <label>Badge (optional)
                <input name="badge" placeholder="e.g. Bestseller, New" defaultValue={editingProduct.b} />
              </label>
              <label className="wide">Image URL or site path (optional)
                <input name="imageUrl" placeholder="/images/products/photo.jpg" defaultValue={editingProduct.imageUrl} />
              </label>
            </div>
            <div className="admin-editor-footer">
              <button type="button" className="admin-text-button" onClick={() => setEditingProduct(null)}>Cancel</button>
              <button className="admin-primary-button" type="submit" disabled={busy || categories.length === 0}>
                {busy ? "Saving…" : "Save product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingCategory && (
        <div className="admin-modal-backdrop" onClick={() => setEditingCategory(null)}>
          <form
            className="admin-editor-modal admin-category-editor"
            onSubmit={saveCategory}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-editor-heading">
              <div>
                <span className="admin-eyebrow">STORE CATEGORIES</span>
                <h2>{editingCategory.id ? "Edit category" : "Add category"}</h2>
              </div>
              <button type="button" className="admin-close-button" aria-label="Close" onClick={() => setEditingCategory(null)}>×</button>
            </div>
            <div className="admin-editor-fields">
              <label className="wide">Category name
                <input name="name" required defaultValue={editingCategory.name} />
              </label>
              <label>Icon / emoji
                <input name="emoji" maxLength="8" defaultValue={editingCategory.emoji} />
              </label>
              <label>Theme color
                <input name="color" type="color" defaultValue={editingCategory.color || "#9db18a"} />
              </label>
              <label className="wide">Image URL or site path (optional)
                <input name="imageUrl" placeholder="/images/catalog/photo.jpg" defaultValue={editingCategory.imageUrl} />
              </label>
            </div>
            <div className="admin-editor-footer">
              <button type="button" className="admin-text-button" onClick={() => setEditingCategory(null)}>Cancel</button>
              <button className="admin-primary-button" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save category"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
