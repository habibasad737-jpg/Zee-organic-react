import { createContext, useContext, useEffect, useState } from "react";
import { useCatalog } from "./catalog.jsx";
import { brand } from "../config.js";
const Ctx = createContext();
export const useCart = () => useContext(Ctx);
export function CartProvider({ children }) {
  const { products } = useCatalog();
  const [lines, setLines] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("zee-cart") || "[]");
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("zee-cart", JSON.stringify(lines));
    } catch {}
  }, [lines]);
  const change = (id, k) =>
    setLines((l) =>
      l.find((y) => y.id === id)
        ? l
            .map((y) => (y.id === id ? { ...y, q: y.q + k } : y))
            .filter((y) => y.q > 0)
        : [...l, { id, q: 1 }],
    );
  const items = lines
    .map((l) => ({ ...l, p: products.find((x) => x.id === l.id) }))
    .filter((i) => i.p);
  const sub = items.reduce((s, i) => s + i.p.p * i.q, 0),
    ship = sub ? brand.shippingFee : 0;
  return (
    <Ctx.Provider
      value={{
        items,
        count: items.reduce((s, i) => s + i.q, 0),
        change,
        sub,
        ship,
        total: sub + ship,
        open,
        setOpen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
