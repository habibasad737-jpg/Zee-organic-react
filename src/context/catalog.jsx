import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
} from "react";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { C, P } from "../data.js";

const CATALOG_PATH = ["storefront", "catalog"];
const defaultCategories = C.map(([name, color, emoji, id]) => ({
  id,
  name,
  color,
  emoji,
  imageUrl: "",
}));
const defaultCatalog = { products: P, categories: defaultCategories };

const CatalogContext = createContext({
  products: P,
  categories: defaultCategories,
  catalogLoading: true,
  catalogExists: false,
  catalogError: "",
  saveCatalog: async () => {},
  initializeCatalog: async () => {},
});

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(P);
  const [categories, setCategories] = useState(defaultCategories);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogExists, setCatalogExists] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, ...CATALOG_PATH),
      (snapshot) => {
        setCatalogExists(snapshot.exists());
        if (snapshot.exists()) {
          const catalog = snapshot.data();
          if (Array.isArray(catalog.products) && Array.isArray(catalog.categories)) {
            setProducts(catalog.products);
            setCategories(catalog.categories);
            setCatalogError("");
          } else {
            setCatalogError("The saved catalog data is incomplete.");
          }
        } else {
          setProducts(P);
          setCategories(defaultCategories);
          setCatalogError("");
        }
        setCatalogLoading(false);
      },
      (error) => {
        console.error("Unable to load the shared product catalog.", error);
        setCatalogError(error.message || "Unable to load the product catalog.");
        setCatalogLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const saveCatalog = useCallback(async (nextCatalog) => {
    if (!auth.currentUser?.emailVerified) {
      throw new Error("Sign in with the verified administrator account to manage the catalog.");
    }
    await setDoc(doc(db, ...CATALOG_PATH), {
      products: nextCatalog.products,
      categories: nextCatalog.categories,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.uid,
    });
  }, []);

  const initializeCatalog = useCallback(async () => {
    if (!auth.currentUser?.emailVerified) {
      throw new Error("Sign in with the verified administrator account to initialize the catalog.");
    }
    const catalogRef = doc(db, ...CATALOG_PATH);
    const snapshot = await getDoc(catalogRef);
    if (!snapshot.exists()) {
      await setDoc(catalogRef, {
        ...defaultCatalog,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid,
      });
    }
  }, []);

  return (
    <CatalogContext.Provider
      value={{
        products,
        categories,
        catalogLoading,
        catalogExists,
        catalogError,
        saveCatalog,
        initializeCatalog,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  return useContext(CatalogContext);
}
