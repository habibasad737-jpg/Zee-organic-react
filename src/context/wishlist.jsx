import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./auth.jsx";

const WishlistContext = createContext({
  ids: [],
  error: "",
  ready: false,
  toggle: () => {},
});

const storageKey = (uid) => `zee-wishlist:${uid}`;

function readIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((id) => typeof id === "string")
      : [];
  } catch (error) {
    console.error("Unable to read the saved wishlist.", error);
    return [];
  }
}

export function WishlistProvider({ children }) {
  const { user, loading } = useAuth();
  const owner = user?.uid || "guest";
  const [snapshot, setSnapshot] = useState({ owner: null, ids: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;

    let ids = readIds(storageKey(owner));
    if (user) {
      const guestIds = readIds(storageKey("guest"));
      ids = [...new Set([...ids, ...guestIds])];
      try {
        localStorage.setItem(storageKey(owner), JSON.stringify(ids));
        localStorage.removeItem(storageKey("guest"));
        setError("");
      } catch (storageError) {
        console.error(
          "Unable to save the wishlist for this account.",
          storageError,
        );
        setError("Wishlist storage is unavailable in this browser.");
      }
    }
    setSnapshot({ owner, ids });
  }, [loading, owner, user]);

  const toggle = useCallback(
    (productId) => {
      if (loading || snapshot.owner !== owner) return;

      const ids = snapshot.ids.includes(productId)
        ? snapshot.ids.filter((id) => id !== productId)
        : [...snapshot.ids, productId];
      try {
        localStorage.setItem(storageKey(owner), JSON.stringify(ids));
        setError("");
        setSnapshot({ owner, ids });
      } catch (storageError) {
        console.error("Unable to update the saved wishlist.", storageError);
        setError(
          "Could not save your wishlist. Check browser storage settings.",
        );
      }
    },
    [loading, owner, snapshot],
  );

  const ready = !loading && snapshot.owner === owner;
  return (
    <WishlistContext.Provider
      value={{ ids: ready ? snapshot.ids : [], error, ready, toggle }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
