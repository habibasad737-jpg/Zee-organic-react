import { useEffect, useState } from "react";
import { useCart } from "../context/cart.jsx";
import { money, instaWorld } from "../config.js";
import { useAuth } from "../context/auth.jsx";
import {
  loadDeliveryInfo,
  makeDeliveryInfo,
  saveDeliveryInfo,
} from "../accountProfile.js";
import { db } from "../firebase.js";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { pakistanLocations } from "../data/pakistanLocations.js";
import { instaCities } from "../data/instaCities.js";

// Match what the customer typed to InstaWorld's exact city name (case-insensitive).
const findInstaCity = (value) => {
  const v = String(value || "").trim().toUpperCase();
  return v ? instaCities.find((c) => c.toUpperCase() === v) || "" : "";
};

// --- INSTA WORLD FUNCTION ---
// Sends only the order id and the customer's sign-in token. The server reads the
// saved order from Firestore and re-checks prices before booking the courier.
async function createInstaWorldParcel(user, orderId) {
  try {
    const idToken = await user.getIdToken();
    const res = await fetch(instaWorld.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, id_token: idToken }),
    });
    return await res.json();
  } catch (err) {
    console.error("Insta World Error:", err);
    return { success: false, error: "network_error", message: err.message };
  }
}

export default function CartDrawer() {
  const c = useCart();
  const { user, loading: authLoading } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    const f = (e) => e.key === "Escape" && c.setOpen(false);
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, []);

  useEffect(() => {
    setCheckoutOpen(false);
    setCheckoutError("");
    if (!user) {
      setDeliveryInfo(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !c.open) return undefined;
    let active = true;
    setCheckoutError("");
    const loadProfile = async () => {
      try {
        const { deliveryInfo: savedInfo, syncWarning } =
          await loadDeliveryInfo(user);
        if (active) {
          setDeliveryInfo(savedInfo);
          setCheckoutError(syncWarning);
        }
      } catch (error) {
        console.error("Unable to load the customer profile for checkout.", error);
        if (active) {
          setDeliveryInfo(makeDeliveryInfo(user));
          setCheckoutError("Could not load your saved account details.");
        }
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [c.open, user]);

  const updateDeliveryField = (field, value) => {
    setDeliveryInfo((current) => ({ ...current, [field]: value }));
    setCheckoutError("");
  };

  const handleBuyNow = async (event) => {
    event.preventDefault();
    if (!user || !deliveryInfo || !c.items.length || submitting) return;

    const orderDeliveryInfo = {
      ...deliveryInfo,
      fullName: deliveryInfo.fullName.trim(),
      phone: deliveryInfo.phone.trim(),
      building: deliveryInfo.building.trim(),
      area: deliveryInfo.area.trim(),
      locality: deliveryInfo.locality.trim(),
      address: deliveryInfo.address.trim(),
    };
    if (
      !orderDeliveryInfo.fullName ||
      !orderDeliveryInfo.phone ||
      !orderDeliveryInfo.province ||
      !orderDeliveryInfo.city ||
      !orderDeliveryInfo.building ||
      !orderDeliveryInfo.area
    ) {
      setCheckoutError("Complete all required delivery details to continue.");
      return;
    }
    const instaCity = findInstaCity(orderDeliveryInfo.city);
    if (!instaCity) {
      setCheckoutError(
        `We can't deliver to "${orderDeliveryInfo.city}". Please choose your city from the list (start typing to search).`,
      );
      return;
    }
    orderDeliveryInfo.city = instaCity;

    setSubmitting(true);
    setCheckoutError("");
    try {
      let profileSaveFailed = false;
      try {
        await saveDeliveryInfo(user, orderDeliveryInfo);
      } catch (profileError) {
        console.error(
          "Unable to update the customer profile from checkout.",
          profileError,
        );
        profileSaveFailed = true;
      }

      // 1. Save the order to Firestore first, so a shipment never exists without an order.
      const newOrderRef = doc(collection(db, "orders"));
      const orderId = newOrderRef.id;

      const orderItems = c.items.map(({ p, q }) => ({
        id: p.id,
        name: p.n,
        price: p.p,
        qty: q,
      }));

      await setDoc(newOrderRef, {
        userId: user.uid,
        email: user.email || "",
        customerName: orderDeliveryInfo.fullName,
        phone: orderDeliveryInfo.phone,
        address: orderDeliveryInfo,
        items: orderItems,
        subtotal: c.sub,
        shipping: c.ship,
        total: c.total,
        count: c.count,
        status: "pending",
        instaTracking: null,
        instaError: null,
        createdAt: serverTimestamp(),
      });

      c.items.forEach(({ p, q }) => c.change(p.id, -q));

      // 2. Ask the server to book the InstaWorld courier for this saved order.
      const instaResult = await createInstaWorldParcel(user, orderId);
      const trackingNumber = instaResult?.tracking_number || null;
      try {
        await updateDoc(newOrderRef, {
          instaTracking: trackingNumber,
          instaError: trackingNumber
            ? null
            : `${instaResult?.error || "unknown_error"}: ${instaResult?.message || ""}`.slice(0, 500),
        });
      } catch (trackingError) {
        // The order is saved; the admin can still add tracking by hand.
        console.error("Unable to save the courier result on the order.", trackingError);
      }
      setCheckoutOpen(false);
      c.setOpen(false);

      if (trackingNumber) {
        alert(
          `Order placed! Courier Tracking: ${trackingNumber}. We will contact you soon.`,
        );
      } else {
        alert(
          profileSaveFailed
            ? "Order placed! We will contact you soon. Your address was saved with the order, but could not be updated in your account profile."
            : "Order placed! We will contact you soon.",
        );
      }
    } catch (error) {
      console.error("Unable to place the order.", error);
      setCheckoutError(
        "Unable to place the order. Please try again, or contact us on WhatsApp.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        id="ov"
        className={c.open ? "open" : ""}
        onClick={() => c.setOpen(false)}
      />
      <aside
        id="dr"
        className={c.open ? "open" : ""}
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={!c.open}
      >
        <div className="h">
          <h2 style={{ fontSize: 22 }}>Your cart</h2>
          <button
            className="ic"
            onClick={() => c.setOpen(false)}
            aria-label="Close cart"
          >
            X
          </button>
        </div>
        <ul id="ci">
          {c.items.length ? (
            c.items.map(({ p, q }) => (
              <li key={p.id}>
                <div>
                  <a
                    className="cart-product-link"
                    href={`/product/${encodeURIComponent(p.id)}`}
                    onClick={() => c.setOpen(false)}
                  >
                    <b>{p.n}</b>
                    <small>
                      {money(p.p)} · {p.w}
                    </small>
                    <span>View product details</span>
                  </a>
                </div>
                <div className="q">
                  <button
                    onClick={() => c.change(p.id, -1)}
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span aria-live="polite">{q}</span>
                  <button
                    onClick={() => c.change(p.id, 1)}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li>Your cart is empty. Add something from the shop.</li>
          )}
        </ul>
        <div className="tot">
          <p>
            <span>Subtotal</span>
            <span>{money(c.sub)}</span>
          </p>
          <p>
            <span>Shipping</span>
            <span>{money(c.ship)}</span>
          </p>
          <p style={{ fontWeight: 700, fontSize: 16 }}>
            <span>Total</span>
            <span>{money(c.total)}</span>
          </p>
          {c.count > 0 && authLoading && (
            <button className="btn" type="button" disabled>
              Checking sign-in...
            </button>
          )}
          {c.count > 0 && !authLoading && !user && (
            <a
              className="btn"
              href="/account?signin=1"
              onClick={() => c.setOpen(false)}
            >
              Sign in / Log in
            </a>
          )}
          {c.count > 0 && !authLoading && user && !checkoutOpen && (
            <button
              className="btn"
              type="button"
              onClick={() => {
                setCheckoutOpen(true);
                setCheckoutError("");
              }}
            >
              Buy Now
            </button>
          )}
          {c.count > 0 &&
            !authLoading &&
            user &&
            checkoutOpen &&
            deliveryInfo && (
              <form className="cart-checkout" onSubmit={handleBuyNow}>
                <h3>Confirm delivery details</h3>
                <label>
                  Full name *
                  <input
                    autoComplete="name"
                    required
                    value={deliveryInfo.fullName}
                    onChange={(event) =>
                      updateDeliveryField("fullName", event.target.value)
                    }
                  />
                </label>
                <label>
                  Phone number *
                  <input
                    autoComplete="tel"
                    type="tel"
                    required
                    value={deliveryInfo.phone}
                    onChange={(event) =>
                      updateDeliveryField("phone", event.target.value)
                    }
                  />
                </label>
                <label>
                  Province / region *
                  <select
                    required
                    value={deliveryInfo.province}
                    onChange={(event) =>
                      updateDeliveryField("province", event.target.value)
                    }
                  >
                    <option value="">Choose a province</option>
                    {Object.keys(pakistanLocations).map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  City * (type to search)
                  <input
                    required
                    list="insta-city-list"
                    autoComplete="off"
                    placeholder="e.g. MARDAN"
                    value={deliveryInfo.city}
                    onChange={(event) =>
                      updateDeliveryField("city", event.target.value)
                    }
                    onBlur={(event) => {
                      const match = findInstaCity(event.target.value);
                      if (match) updateDeliveryField("city", match);
                    }}
                  />
                  <datalist id="insta-city-list">
                    {instaCities.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </label>
                <label>
                  House / street *
                  <input
                    autoComplete="address-line1"
                    required
                    value={deliveryInfo.building}
                    onChange={(event) =>
                      updateDeliveryField("building", event.target.value)
                    }
                  />
                </label>
                <label>
                  Area / neighbourhood *
                  <input
                    required
                    value={deliveryInfo.area}
                    onChange={(event) =>
                      updateDeliveryField("area", event.target.value)
                    }
                  />
                </label>
                <label>
                  Colony / landmark
                  <input
                    value={deliveryInfo.locality}
                    onChange={(event) =>
                      updateDeliveryField("locality", event.target.value)
                    }
                  />
                </label>
                <label>
                  Extra delivery directions
                  <input
                    value={deliveryInfo.address}
                    onChange={(event) =>
                      updateDeliveryField("address", event.target.value)
                    }
                  />
                </label>
                {checkoutError && (
                  <p className="cart-checkout-error" role="alert">
                    {checkoutError}
                  </p>
                )}
                <div className="cart-checkout-actions">
                  <button
                    className="btn o"
                    type="button"
                    onClick={() => setCheckoutOpen(false)}
                    disabled={submitting}
                  >
                    Back
                  </button>
                  <button className="btn" type="submit" disabled={submitting}>
                    {submitting ? "Placing order..." : `Confirm & Buy · ${money(c.total)}`}
                  </button>
                </div>
              </form>
            )}
        </div>
      </aside>
    </>
  );
}