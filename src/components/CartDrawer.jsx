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
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { pakistanLocations } from "../data/pakistanLocations.js";

// --- INSTA WORLD FUNCTION ---
async function createInstaWorldParcel(orderData) {
  try {
    const payload = {
      customer_name: orderData.customerName || orderData.name,
      customer_phone: orderData.phone,
      customer_address: `${orderData.address?.building || ''}, ${orderData.address?.area || ''}, ${orderData.address?.city || ''}`,
      customer_city: orderData.address?.city,
      customer_province: orderData.address?.province,
      cod_amount: orderData.total,
      order_id: orderData.orderId || Date.now().toString(),
      pieces: orderData.count?.toString() || "1",
    };

    console.log("Sending via proxy:", payload);

    const res = await fetch('/api/create-shipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    console.log("Insta World Response:", result);
    
    if (!res.ok) {
      console.error("Insta failed:", result);
      return null;
    }
    return result;

  } catch (err) {
    console.log("Insta World Error:", err);
    return null;
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

      // 1. Save to Firebase
      const orderRef = await addDoc(collection(db, "orders"), {
        userId: user.uid,
        email: user.email || "",
        customerName: orderDeliveryInfo.fullName,
        phone: orderDeliveryInfo.phone,
        address: orderDeliveryInfo,
        items: c.items.map(({ p, q }) => ({
          id: p.id,
          name: p.n,
          price: p.p,
          qty: q,
        })),
        subtotal: c.sub,
        shipping: c.ship,
        total: c.total,
        count: c.count,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      // 2. SEND TO INSTA WORLD COURIER - FIXED CODE!
      const instaResult = await createInstaWorldParcel({
        customerName: orderDeliveryInfo.fullName,
        phone: orderDeliveryInfo.phone,
        address: `${orderDeliveryInfo.building}, ${orderDeliveryInfo.area}, ${orderDeliveryInfo.city}, ${orderDeliveryInfo.province}`,
        city: orderDeliveryInfo.city,
        items: c.items.map(({ p, q }) => ({ name: p.n, qty: q })),
        total: c.total,
        count: c.count,
        orderId: orderRef.id,
      });

      c.items.forEach(({ p, q }) => c.change(p.id, -q));
      setCheckoutOpen(false);
      c.setOpen(false);

      if (instaResult && instaResult.tracking_number) {
        alert(
          `Order placed! Tracking: ${instaResult.tracking_number}. We will contact you soon.`,
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
        error.message || "Unable to place the order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cities = deliveryInfo?.province
    ? (pakistanLocations[deliveryInfo.province] ?? [])
    : [];

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
                    onChange={(event) => {
                      updateDeliveryField("province", event.target.value);
                      updateDeliveryField("city", "");
                    }}
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
                  City *
                  <select
                    required
                    disabled={!deliveryInfo.province}
                    value={deliveryInfo.city}
                    onChange={(event) =>
                      updateDeliveryField("city", event.target.value)
                    }
                  >
                    <option value="">Choose a city</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
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