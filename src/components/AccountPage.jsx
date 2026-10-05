import { useCallback, useEffect, useState } from "react";
import { sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase.js";
import {
  loadDeliveryInfo,
  makeDeliveryInfo,
  saveDeliveryInfo as saveAccountDeliveryInfo,
} from "../accountProfile.js";
import { money } from "../config.js";
import { useAuth } from "../context/auth.jsx";
import { useWishlist } from "../context/wishlist.jsx";
import { P } from "../data.js";
import { pakistanLocations } from "../data/pakistanLocations.js";
import SignInModal from "./SignInModal.jsx";
import ProductCard from "./ProductCard.jsx";

const sections = [
  ["profile", "Manage My Account", "☺"],
  ["orders", "My Orders", "▱"],
  ["wishlist", "My Wishlist & Followed Stores", "♡"],
  ["reviews", "My Reviews", "☆"],
  ["returns", "My Returns & Cancellations", "×"],
];

const formatOrderDate = (createdAt) => {
  const date = createdAt?.toDate?.();
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Date unavailable";
};

export default function AccountPage() {
  const { user, loading } = useAuth();
  const { ids: wishlistIds, error: wishlistError, ready } = useWishlist();
  const [section, setSection] = useState("profile");
  const [signInOpen, setSignInOpen] = useState(
    new URLSearchParams(window.location.search).get("signin") === "1",
  );
  const [displayName, setDisplayName] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [savedDeliveryInfo, setSavedDeliveryInfo] = useState(null);
  const [deliveryReady, setDeliveryReady] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);

  useEffect(() => {
    if (!showSavedPopup) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowSavedPopup(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showSavedPopup]);

  useEffect(() => {
    if (!user) {
      setDeliveryReady(false);
      setDeliveryInfo(null);
      setSavedDeliveryInfo(null);
      return undefined;
    }

    let active = true;
    setDeliveryReady(false);
    setEditingProfile(false);
    setDisplayName(user.displayName || "");
    setError("");

    const loadProfile = async () => {
      try {
        const { deliveryInfo: savedInfo, syncWarning } =
          await loadDeliveryInfo(user);
        if (!active) return;
        setDeliveryInfo(savedInfo);
        setSavedDeliveryInfo(savedInfo);
        setError(syncWarning);
      } catch (loadError) {
        console.error("Unable to load the customer profile.", loadError);
        if (active) {
          const emptyInfo = makeDeliveryInfo(user);
          setDeliveryInfo(emptyInfo);
          setSavedDeliveryInfo(emptyInfo);
          setError(
            "Could not load your saved account details. Please try again.",
          );
        }
      } finally {
        if (active) setDeliveryReady(true);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || section !== "orders") return undefined;

    let active = true;
    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");
      try {
        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
        );
        const snapshot = await getDocs(ordersQuery);
        if (!active) return;

        const customerOrders = snapshot.docs.map((orderDoc) => ({
          id: orderDoc.id,
          ...orderDoc.data(),
        }));
        customerOrders.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
        setOrders(customerOrders);
      } catch (loadError) {
        console.error("Unable to load customer orders.", loadError);
        if (active) {
          setOrdersError(
            "We couldn't load your orders. Please try again in a moment.",
          );
        }
      } finally {
        if (active) setOrdersLoading(false);
      }
    };

    loadOrders();
    return () => {
      active = false;
    };
  }, [section, user]);

  const saveDeliveryInfo = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const nextDeliveryInfo = {
      ...deliveryInfo,
      fullName: deliveryInfo.fullName.trim(),
      phone: deliveryInfo.phone.trim(),
      building: deliveryInfo.building.trim(),
      area: deliveryInfo.area.trim(),
      locality: deliveryInfo.locality.trim(),
      address: deliveryInfo.address.trim(),
    };
    if (!nextDeliveryInfo.province || !nextDeliveryInfo.city) {
      setError("Choose a province and city before saving your address.");
      return;
    }

    setBusy(true);
    try {
      await saveAccountDeliveryInfo(user, nextDeliveryInfo);
      if (nextDeliveryInfo.fullName !== (user.displayName || "")) {
        await updateProfile(user, { displayName: nextDeliveryInfo.fullName });
      }
      setDisplayName(nextDeliveryInfo.fullName);
      setDeliveryInfo(nextDeliveryInfo);
      setSavedDeliveryInfo(nextDeliveryInfo);
      setEditingProfile(false);
      setShowSavedPopup(true);
    } catch (saveError) {
      console.error("Unable to save the customer profile.", saveError);
      setError(
        saveError.message || "Could not save your account details.",
      );
    } finally {
      setBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!user.email) {
      setError(
        "This account does not have an email address for password reset.",
      );
      setMessage("");
      return;
    }
    setMessage("");
    setError("");
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage(`Password reset instructions were sent to ${user.email}.`);
    } catch (resetError) {
      console.error("Unable to send the password reset email.", resetError);
      setError(
        resetError.message || "Could not send the password reset email.",
      );
    } finally {
      setBusy(false);
    }
  };

  const logOut = async () => {
    setMessage("");
    setError("");
    setBusy(true);
    try {
      await signOut(auth);
      setSection("profile");
    } catch (signOutError) {
      console.error("Unable to sign out.", signOutError);
      setError(signOutError.message || "Could not sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="wrap account-page" aria-live="polite">
        Loading your account...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="wrap account-page">
        <section className="account-card">
          <p className="product-category">Your Zee Organic account</p>
          <h1>Sign in to view your account</h1>
          <p>
            Sign in or create an account to manage your profile and wishlist.
          </p>
          <button
            className="btn"
            type="button"
            onClick={() => setSignInOpen(true)}
          >
            Sign in / Sign up
          </button>
        </section>
        <SignInModal
          open={signInOpen}
          onClose={closeSignIn}
          onSuccess={closeSignIn}
        />
      </main>
    );
  }

  const savedProducts = P.filter((product) => wishlistIds.includes(product.id));
  const hasDeliveryAddress = Boolean(
    deliveryInfo?.province ||
      deliveryInfo?.city ||
      deliveryInfo?.building ||
      deliveryInfo?.area ||
      deliveryInfo?.locality ||
      deliveryInfo?.address,
  );
  const cancelProfileEdit = () => {
    setDeliveryInfo(savedDeliveryInfo);
    setEditingProfile(false);
    setError("");
    setMessage("");
  };
  const cities = deliveryInfo?.province
    ? pakistanLocations[deliveryInfo.province] || []
    : [];
  const updateDeliveryField = (field, value) => {
    setDeliveryInfo((current) => ({
      ...current,
      [field]: value,
      ...(field === "province" ? { city: "", area: "" } : {}),
      ...(field === "city" ? { area: "" } : {}),
    }));
    setMessage("");
    setError("");
  };

  return (
    <main className="wrap account-dashboard">
      <section className="account-welcome">
        <div>
          <p className="product-category">Your Zee Organic account</p>
          <h1>Hello, {displayName || user.email || user.phoneNumber}</h1>
          <p>
            Manage your profile and keep track of your Zee Organic activity.
          </p>
        </div>
        <button
          className="btn account-signout"
          type="button"
          onClick={logOut}
          disabled={busy}
        >
          Log out
        </button>
      </section>

      <div className="account-layout">
        <nav className="account-menu" aria-label="Account pages">
          {sections.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={section === id ? "active" : ""}
              aria-current={section === id ? "page" : undefined}
              onClick={() => {
                setSection(id);
                setMessage("");
                setError("");
              }}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
          <button
            type="button"
            className="account-menu-logout"
            onClick={logOut}
            disabled={busy}
          >
            <span aria-hidden="true">⇥</span>
            Logout
          </button>
        </nav>

        <section className="account-content" aria-live="polite">
          {section === "profile" && (
            <>
              <p className="product-category">Profile</p>
              <div className="account-profile-heading">
                <h2>Personal information</h2>
                {deliveryReady && deliveryInfo && (
                  <button
                    className="account-edit-button"
                    type="button"
                    onClick={() => {
                      if (editingProfile) cancelProfileEdit();
                      else setEditingProfile(true);
                    }}
                    aria-label={
                      editingProfile ? "Cancel editing details" : "Edit details"
                    }
                  >
                    {editingProfile ? (
                      "Cancel"
                    ) : (
                      <>
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m12.8 3.2 4 4M3 17l3.7-.8L16.6 6.3a2.1 2.1 0 0 0-3-3L3.7 13.2 3 17Z" />
                        </svg>
                        Edit details
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="account-section-lead">
                Your contact details and delivery address, saved to your
                account.
              </p>
              {!deliveryReady || !deliveryInfo ? (
                <p aria-live="polite">Loading your account details...</p>
              ) : editingProfile ? (
                <form
                  className="delivery-form"
                  onSubmit={saveDeliveryInfo}
                  autoComplete="on"
                >
                  <div className="delivery-fields">
                    <div className="delivery-field">
                      <label htmlFor="delivery-name">Full name</label>
                      <input
                        id="delivery-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Enter your first and last name"
                        value={deliveryInfo.fullName}
                        onChange={(event) =>
                          updateDeliveryField("fullName", event.target.value)
                        }
                        maxLength={80}
                        required
                      />
                    </div>
                    <div className="delivery-field">
                      <label htmlFor="delivery-province">
                        Province / region
                      </label>
                      <select
                        id="delivery-province"
                        name="address-level1"
                        autoComplete="address-level1"
                        value={deliveryInfo.province}
                        onChange={(event) =>
                          updateDeliveryField("province", event.target.value)
                        }
                        required
                      >
                        <option value="">Please choose your province</option>
                        {Object.keys(pakistanLocations).map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="delivery-field">
                      <label htmlFor="delivery-phone">Phone number</label>
                      <input
                        id="delivery-phone"
                        name="tel"
                        type="tel"
                        autoComplete="tel"
                        placeholder="e.g. +92 300 1234567"
                        value={deliveryInfo.phone}
                        onChange={(event) =>
                          updateDeliveryField("phone", event.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="delivery-field">
                      <label htmlFor="delivery-city">City</label>
                      <select
                        id="delivery-city"
                        name="address-level2"
                        autoComplete="address-level2"
                        value={deliveryInfo.city}
                        onChange={(event) =>
                          updateDeliveryField("city", event.target.value)
                        }
                        disabled={!deliveryInfo.province}
                        required
                      >
                        <option value="">
                          {deliveryInfo.province
                            ? "Please choose your city"
                            : "Choose a province first"}
                        </option>
                        {cities.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="delivery-field">
                      <label htmlFor="delivery-building">
                        Building / house / floor / street
                      </label>
                      <input
                        id="delivery-building"
                        name="address-line1"
                        autoComplete="address-line1"
                        placeholder="House, apartment, floor, street"
                        value={deliveryInfo.building}
                        onChange={(event) =>
                          updateDeliveryField("building", event.target.value)
                        }
                        required
                      />
                    </div>
                    <div className="delivery-field">
                      <label htmlFor="delivery-area">
                        Area / neighbourhood
                      </label>
                      <input
                        id="delivery-area"
                        name="address-area"
                        placeholder="Choose a city, then enter your area"
                        value={deliveryInfo.area}
                        onChange={(event) =>
                          updateDeliveryField("area", event.target.value)
                        }
                        disabled={!deliveryInfo.city}
                        required
                      />
                    </div>
                    <div className="delivery-field">
                      <label htmlFor="delivery-locality">
                        Colony / suburb / landmark
                      </label>
                      <input
                        id="delivery-locality"
                        name="address-line2"
                        autoComplete="address-line2"
                        placeholder="Colony, suburb or nearby landmark"
                        value={deliveryInfo.locality}
                        onChange={(event) =>
                          updateDeliveryField("locality", event.target.value)
                        }
                      />
                    </div>
                    <div className="delivery-field">
                      <label htmlFor="delivery-address">Address details</label>
                      <input
                        id="delivery-address"
                        name="address-details"
                        placeholder="Any extra directions for delivery"
                        value={deliveryInfo.address}
                        onChange={(event) =>
                          updateDeliveryField("address", event.target.value)
                        }
                      />
                    </div>
                    <div className="delivery-field">
                      <label htmlFor="delivery-email">Email address</label>
                      <input
                        id="delivery-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={user.email || ""}
                        placeholder="No email is linked to this account"
                        readOnly
                      />
                    </div>
                    <fieldset className="delivery-label">
                      <legend>Delivery label</legend>
                      <label>
                        <input
                          type="radio"
                          name="delivery-label"
                          value="home"
                          checked={deliveryInfo.label === "home"}
                          onChange={() => updateDeliveryField("label", "home")}
                        />
                        <span aria-hidden="true">⌂</span>
                        Home
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="delivery-label"
                          value="office"
                          checked={deliveryInfo.label === "office"}
                          onChange={() =>
                            updateDeliveryField("label", "office")
                          }
                        />
                        <span aria-hidden="true">▣</span>
                        Office
                      </label>
                    </fieldset>
                  </div>
                  <div className="delivery-form-footer">
                    <p>
                      These details are saved to your account and available
                      when you sign in on another device.
                    </p>
                    <div className="account-actions">
                      <button className="btn" type="submit" disabled={busy}>
                        {busy ? "Saving..." : "Save details"}
                      </button>
                      <button
                        className="btn account-signout"
                        type="button"
                        onClick={sendPasswordReset}
                        disabled={busy || !user.email}
                      >
                        Reset password
                      </button>
                      <button
                        className="btn account-signout"
                        type="button"
                        onClick={cancelProfileEdit}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="account-profile-summary">
                  <section className="account-profile-card">
                    <h3>Contact details</h3>
                    <dl>
                      <div>
                        <dt>Full name</dt>
                        <dd>{deliveryInfo.fullName || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Email address</dt>
                        <dd>{user.email || "No email linked to this account"}</dd>
                      </div>
                      <div>
                        <dt>Phone number</dt>
                        <dd>{deliveryInfo.phone || "Not provided"}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="account-profile-card">
                    <h3>Delivery address</h3>
                    {hasDeliveryAddress ? (
                      <dl>
                        <div>
                          <dt>Delivery label</dt>
                          <dd>
                            {deliveryInfo.label === "office" ? "Office" : "Home"}
                          </dd>
                        </div>
                        <div>
                          <dt>Province / region</dt>
                          <dd>{deliveryInfo.province || "Not provided"}</dd>
                        </div>
                        <div>
                          <dt>City</dt>
                          <dd>{deliveryInfo.city || "Not provided"}</dd>
                        </div>
                        <div>
                          <dt>Building / street</dt>
                          <dd>{deliveryInfo.building || "Not provided"}</dd>
                        </div>
                        <div>
                          <dt>Area / neighbourhood</dt>
                          <dd>{deliveryInfo.area || "Not provided"}</dd>
                        </div>
                        {deliveryInfo.locality && (
                          <div>
                            <dt>Colony / landmark</dt>
                            <dd>{deliveryInfo.locality}</dd>
                          </div>
                        )}
                        {deliveryInfo.address && (
                          <div>
                            <dt>Address details</dt>
                            <dd>{deliveryInfo.address}</dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="account-profile-empty">
                        No delivery address saved yet. Choose Edit details to
                        add one.
                      </p>
                    )}
                  </section>
                  <div className="account-profile-footer">
                    <p>
                      Your email address is managed by your sign-in method.
                    </p>
                    <button
                      className="btn account-signout"
                      type="button"
                      onClick={sendPasswordReset}
                      disabled={busy || !user.email}
                    >
                      Reset password
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {section === "orders" && (
            <>
              <p className="product-category">Purchases</p>
              <h2>My Orders</h2>
              {ordersLoading ? (
                <p aria-live="polite">Loading your orders...</p>
              ) : ordersError ? (
                <p className="account-error" role="alert">
                  {ordersError}
                </p>
              ) : orders.length ? (
                <div className="account-orders">
                  {orders.map((order) => (
                    <article className="account-order" key={order.id}>
                      <header className="account-order-header">
                        <div>
                          <h3>Order {order.id.slice(0, 8).toUpperCase()}</h3>
                          <p>{formatOrderDate(order.createdAt)}</p>
                        </div>
                        <span className="account-order-status">
                          {order.status || "pending"}
                        </span>
                      </header>
                      <ul className="account-order-items">
                        {(order.items || []).map((item, index) => (
                          <li key={`${item.id || item.name}-${index}`}>
                            <span>
                              {item.name} <b>× {item.qty}</b>
                            </span>
                            <span>{money(item.price * item.qty)}</span>
                          </li>
                        ))}
                      </ul>
                      {order.address && (
                        <p className="account-order-address">
                          Delivery to:{" "}
                          {[
                            order.address.fullName,
                            order.address.building,
                            order.address.area,
                            order.address.locality,
                            order.address.city,
                            order.address.province,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      <div className="account-order-total">
                        <span>Order total</span>
                        <b>{money(order.total || 0)}</b>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="account-empty">
                  <span aria-hidden="true">▱</span>
                  <h3>No orders to show yet</h3>
                  <p>Your purchases will appear here after you place an order.</p>
                  <a className="btn" href="/shop">
                    Browse products
                  </a>
                </div>
              )}
            </>
          )}

          {section === "wishlist" && (
            <>
              <p className="product-category">Saved items</p>
              <h2>My Wishlist</h2>
              <p className="account-section-lead">
                Saved items are stored in this browser for your signed-in
                account. Store following is not available because this site
                currently has one store.
              </p>
              {wishlistError && (
                <p className="account-error" role="alert">
                  {wishlistError}
                </p>
              )}
              {!ready ? (
                <p aria-live="polite">Loading your saved items...</p>
              ) : savedProducts.length ? (
                <div className="grid account-wishlist-grid">
                  {savedProducts.map((product) => (
                    <ProductCard key={product.id} p={product} />
                  ))}
                </div>
              ) : (
                <div className="account-empty">
                  <span aria-hidden="true">♡</span>
                  <h3>Your wishlist is empty</h3>
                  <p>Use the heart on a product to save it here for later.</p>
                  <a className="btn" href="/shop">
                    Explore the shop
                  </a>
                </div>
              )}
            </>
          )}

          {section === "reviews" && (
            <>
              <p className="product-category">Your feedback</p>
              <h2>My Reviews</h2>
              <div className="account-empty">
                <span aria-hidden="true">☆</span>
                <h3>No reviews submitted</h3>
                <p>
                  Product ratings currently shown on the shop are demo data.
                  Customer review submission and account-linked review storage
                  are not connected yet.
                </p>
              </div>
            </>
          )}

          {section === "returns" && (
            <>
              <p className="product-category">Order support</p>
              <h2>My Returns &amp; Cancellations</h2>
              <div className="account-empty">
                <span aria-hidden="true">×</span>
                <h3>No return requests</h3>
                <p>
                  Returns and cancellations need saved order records. Because
                  checkout is currently a demo and does not create orders, there
                  are no requests to display or manage.
                </p>
                <a className="btn" href="/shop">
                  Continue shopping
                </a>
              </div>
            </>
          )}

          {message && (
            <p className="account-success" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
      {showSavedPopup && (
        <div
          className="delivery-saved-overlay"
          onClick={() => setShowSavedPopup(false)}
        >
          <section
            className="delivery-saved-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-saved-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="delivery-saved-icon" aria-hidden="true">
              ✓
            </span>
            <h2 id="delivery-saved-title">Details saved</h2>
            <p>Your delivery details have been saved successfully.</p>
            <button
              className="btn"
              type="button"
              onClick={() => setShowSavedPopup(false)}
              autoFocus
            >
              Okay
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
