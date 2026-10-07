import { useCallback, useEffect, useState } from "react";
import { sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase.js";
import {
  loadDeliveryInfo,
  makeDeliveryInfo,
  saveDeliveryInfo as saveAccountDeliveryInfo,
} from "../accountProfile.js";
import { money, brand } from "../config.js";
import { useAuth } from "../context/auth.jsx";
import { useWishlist } from "../context/wishlist.jsx";
import { useCatalog } from "../context/catalog.jsx";
import { pakistanLocations } from "../data/pakistanLocations.js";
import SignInModal from "./SignInModal.jsx";
import ProductCard from "./ProductCard.jsx";

const sections = [
  ["profile", "Manage My Account", "☺"],
  ["orders", "My Orders", "▱"],
  ["wishlist", "My Wishlist", "♡"],
  ["reviews", "My Reviews", "☆"],
  ["returns", "My Returns & Cancellations", "×"],
];

const formatOrderDate = (createdAt) => {
  const date = createdAt?.toDate?.();
  return date &&!Number.isNaN(date.getTime())
   ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Date unavailable";
};

const isDeliveredOrder = (order) => order.status === "delivered";
const canCancelOrder = (order) =>
  ["pending", "processing", "shipped"].includes(order.status);
const canReturnOrder = (order) => isDeliveredOrder(order);

export default function AccountPage() {
  const { products } = useCatalog();
  const { user, loading } = useAuth();
  const { ids: wishlistIds, error: wishlistError, ready } = useWishlist();
  const [section, setSection] = useState("orders");
  const [signInOpen, setSignInOpen] = useState(new URLSearchParams(window.location.search).get("signin") === "1");
  const [displayName, setDisplayName] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [savedDeliveryInfo, setSavedDeliveryInfo] = useState(null);
  const [deliveryReady, setDeliveryReady] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [savingReviewKey, setSavingReviewKey] = useState("");
  const [orderActionError, setOrderActionError] = useState("");
  const [busyOrderActionId, setBusyOrderActionId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);

  const printInvoice = () => window.print();

  useEffect(() => {
    if (!showSavedPopup) return;
    const closeOnEscape = (e) => { if (e.key === "Escape") setShowSavedPopup(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showSavedPopup]);

  useEffect(() => {
    if (!user) { setDeliveryReady(false); setDeliveryInfo(null); setSavedDeliveryInfo(null); return; }
    let active = true;
    setDeliveryReady(false); setEditingProfile(false);
    setDisplayName(user.displayName || ""); setError("");
    const loadProfile = async () => {
      try {
        const { deliveryInfo: savedInfo, syncWarning } = await loadDeliveryInfo(user);
        if (!active) return;
        setDeliveryInfo(savedInfo); setSavedDeliveryInfo(savedInfo); setError(syncWarning);
      } catch (e) {
        const emptyInfo = makeDeliveryInfo(user);
        setDeliveryInfo(emptyInfo); setSavedDeliveryInfo(emptyInfo);
        setError("Could not load your saved account details.");
      } finally { if (active) setDeliveryReady(true); }
    };
    loadProfile();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (
      !user ||
      (section !== "orders" && section !== "reviews" && section !== "returns")
    ) {
      return;
    }
    let active = true;
    const loadAccountPurchases = async () => {
      setOrdersLoading(true);
      setReviewsLoading(true);
      setOrdersError("");
      setReviewsError("");
      const ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
      );
      try {
        const snap = await getDocs(ordersQuery);
        if (!active) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) -
            (a.createdAt?.toMillis?.() ?? 0),
        );
        setOrders(list);
      } catch (loadError) {
        console.error("Unable to load customer orders.", loadError);
        if (active) setOrdersError("We couldn't load your orders.");
      } finally {
        if (active) setOrdersLoading(false);
      }

      const reviewsQuery = query(
        collection(db, "reviews"),
        where("userId", "==", user.uid),
      );
      try {
        const snap = await getDocs(reviewsQuery);
        if (!active) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) -
            (a.createdAt?.toMillis?.() ?? 0),
        );
        setReviews(list);
      } catch (loadError) {
        console.error("Unable to load customer reviews.", loadError);
        if (active) {
          setReviewsError("We couldn't load your reviews. Please try again.");
        }
      } finally {
        if (active) setReviewsLoading(false);
      }
    };
    loadAccountPurchases();
    return () => { active = false; };
  }, [section, user]);

  const submitReview = async (order, item) => {
    const reviewKey = `${order.id}_${item.id}`;
    const draft = reviewDrafts[reviewKey];
    const comment = draft?.comment?.trim() || "";
    if (!draft?.rating || !comment) {
      setReviewsError("Choose a star rating and write a review before submitting.");
      return;
    }

    setSavingReviewKey(reviewKey);
    setReviewsError("");
    const review = {
      userId: user.uid,
      userName: (user.displayName || "Verified customer").slice(0, 100),
      orderId: order.id,
      productId: item.id,
      productName: item.name,
      purchaseItem: {
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
      },
      rating: draft.rating,
      comment,
      createdAt: new Date(),
    };
    try {
      await setDoc(doc(db, "reviews", reviewKey), {
        ...review,
        createdAt: serverTimestamp(),
      });
      setReviews((current) => [...current, review]);
    } catch (saveError) {
      console.error("Unable to submit product review.", saveError);
      setReviewsError(
        saveError?.code === "permission-denied"
          ? "Reviews can only be submitted for delivered orders. Please check your Firestore rules."
          : "We couldn't submit your review. Please try again.",
      );
    } finally {
      setSavingReviewKey("");
    }
  };

  const updateCustomerOrderStatus = async (order, status) => {
    if (busyOrderActionId) return;
    const actionLabel = status === "cancelled" ? "cancel" : "return";
    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} order #${order.id
          .slice(0, 8)
          .toUpperCase()}?`,
      )
    ) {
      return;
    }

    setBusyOrderActionId(order.id);
    setOrderActionError("");
    try {
      await updateDoc(doc(db, "orders", order.id), { status });
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, status } : item,
        ),
      );
    } catch (actionError) {
      console.error(`Unable to ${actionLabel} customer order.`, actionError);
      setOrderActionError(
        actionError?.code === "permission-denied"
          ? "This order can no longer be changed. Refresh your orders and try again."
          : `We couldn't ${actionLabel} this order. Please try again.`,
      );
    } finally {
      setBusyOrderActionId("");
    }
  };

  const saveDeliveryInfo = async (e) => {
    e.preventDefault(); setMessage(""); setError("");
    const next = {...deliveryInfo, fullName: deliveryInfo.fullName.trim(), phone: deliveryInfo.phone.trim(), building: deliveryInfo.building.trim(), area: deliveryInfo.area.trim(), locality: deliveryInfo.locality.trim(), address: deliveryInfo.address.trim() };
    if (!next.province ||!next.city) { setError("Choose province and city"); return; }
    setBusy(true);
    try {
      await saveAccountDeliveryInfo(user, next);
      if (next.fullName!== (user.displayName || "")) await updateProfile(user, { displayName: next.fullName });
      setDisplayName(next.fullName); setDeliveryInfo(next); setSavedDeliveryInfo(next); setEditingProfile(false); setShowSavedPopup(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const sendPasswordReset = async () => {
    if (!user.email) { setError("No email for reset"); return; }
    setBusy(true); try { await sendPasswordResetEmail(auth, user.email); setMessage(`Reset sent to ${user.email}`); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const logOut = async () => { setBusy(true); try { await signOut(auth); setSection("profile"); } catch (e) { setError(e.message); } finally { setBusy(false); } };

  if (loading) return <main className="wrap account-page">Loading...</main>;
  if (!user) return <main className="wrap account-page"><section className="account-card"><h1>Sign in to view account</h1><button className="btn" onClick={() => setSignInOpen(true)}>Sign in / Sign up</button></section><SignInModal open={signInOpen} onClose={closeSignIn} onSuccess={closeSignIn} /></main>;

  const savedProducts = products.filter(p => wishlistIds.includes(p.id));
  const hasDeliveryAddress = Boolean(deliveryInfo?.province || deliveryInfo?.city);
  const cancelProfileEdit = () => { setDeliveryInfo(savedDeliveryInfo); setEditingProfile(false); };
  const cities = deliveryInfo?.province? pakistanLocations[deliveryInfo.province] || [] : [];
  const updateDeliveryField = (field, value) => { setDeliveryInfo(c => ({...c, [field]: value,...(field==="province"?{city:"",area:""}:{}),...(field==="city"?{area:""}:{}) })); };

  return (
    <main className="wrap account-dashboard">
      <style>{`
      .invoice-modal{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}
      .invoice-paper{background:#fff;color:#111;max-width:700px;width:100%;padding:28px;border-radius:16px;max-height:90vh;overflow:auto}
      .invoice-line{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #ddd;font-size:14px}
      .account-order{border:1px solid #333;padding:16px;border-radius:14px;margin-bottom:16px;background:#111}
      .tracking-badge{background:#22c55e;color:#000;padding:5px 12px;border-radius:20px;font-weight:800;font-size:12px;display:inline-block;margin-top:6px}
       @media print{.account-menu,.account-welcome{display:none!important}}
      `}</style>

      <section className="account-welcome"><div><p className="product-category">Your Zee Organic account</p><h1>Hello, {displayName || user.email}</h1></div><button className="btn account-signout" onClick={logOut}>Log out</button></section>

      <div className="account-layout">
        <nav className="account-menu">
          {sections.map(([id, label, icon]) => (
            <button key={id} type="button" className={section===id?"active":""} onClick={()=>setSection(id)}><span>{icon}</span> {label}</button>
          ))}
          <button type="button" className="account-menu-logout" onClick={logOut}>⇥ Logout</button>
        </nav>

        <section className="account-content">
          {section==="profile" && (
            <>
              <h2>Personal information</h2>
              {!deliveryReady ||!deliveryInfo? <p>Loading...</p> : editingProfile? (
                <form className="delivery-form" onSubmit={saveDeliveryInfo}>
                  <input value={deliveryInfo.fullName} onChange={e=>updateDeliveryField("fullName", e.target.value)} placeholder="Full name" required />
                  <select value={deliveryInfo.province} onChange={e=>updateDeliveryField("province", e.target.value)} required><option value="">Province</option>{Object.keys(pakistanLocations).map(p=><option key={p} value={p}>{p}</option>)}</select>
                  <select value={deliveryInfo.city} onChange={e=>updateDeliveryField("city", e.target.value)} disabled={!deliveryInfo.province} required><option value="">City</option>{cities.map(c=><option key={c} value={c}>{c}</option>)}</select>
                  <input value={deliveryInfo.phone} onChange={e=>updateDeliveryField("phone", e.target.value)} placeholder="Phone" required />
                  <input value={deliveryInfo.building} onChange={e=>updateDeliveryField("building", e.target.value)} placeholder="House / Street" required />
                  <input value={deliveryInfo.area} onChange={e=>updateDeliveryField("area", e.target.value)} placeholder="Area" required />
                  <button className="btn" type="submit">{busy?"Saving...":"Save details"}</button>
                  <button type="button" className="btn o" onClick={cancelProfileEdit}>Cancel</button>
                </form>
              ) : (
                <div><p><b>{deliveryInfo.fullName}</b> - {deliveryInfo.phone}</p><p>{[deliveryInfo.building, deliveryInfo.area, deliveryInfo.city, deliveryInfo.province].filter(Boolean).join(", ")}</p><button className="btn" onClick={()=>setEditingProfile(true)}>Edit details</button></div>
              )}
            </>
          )}

          {section==="orders" && (
            <>
              <p className="product-category">Purchases & Invoices</p><h2>My Orders - Invoice</h2>
              {orderActionError && <p style={{ color: "salmon" }}>{orderActionError}</p>}
              {ordersLoading? <p>Loading orders...</p> : orders.length? (
                <div>
                  {orders.map(order=>(
                    <article className="account-order" key={order.id}>
                      <div style={{display:'flex', justifyContent:'space-between'}}>
                        <div>
                          <h3 style={{color:'#a3e635'}}>Order #{order.id.slice(0,8).toUpperCase()}</h3>
                          <p style={{fontSize:13}}>{formatOrderDate(order.createdAt)} • {order.count} items</p>
                          {order.instaTracking? <span className="tracking-badge">📦 Tracking: {order.instaTracking}</span> : <span style={{fontSize:12,opacity:0.7}}>⏳ Pending courier</span>}
                        </div>
                        <span style={{background:'#facc15',color:'#000',padding:'4px 10px',borderRadius:20,height:'fit-content',fontSize:12,fontWeight:700}}>{order.status||"pending"}</span>
                      </div>
                      <ul style={{marginTop:12}}>{(order.items||[]).map((it,i)=><li key={i} className="invoice-line"><span>{it.name} × {it.qty}</span><span>{money(it.price*it.qty)}</span></li>)}</ul>
                      <div className="invoice-line"><span>Subtotal</span><span>{money(order.subtotal||0)}</span></div>
                      <div className="invoice-line"><span>Shipping</span><span>{money(order.shipping||0)}</span></div>
                      <div className="invoice-line" style={{fontWeight:800,fontSize:16}}><span>Order total</span><span>{money(order.total||0)}</span></div>
                      <p style={{fontSize:12,opacity:0.8,marginTop:8}}>📍 {order.address? [order.address.fullName, order.address.building, order.address.area, order.address.city].filter(Boolean).join(", "):""}</p>
                      <div style={{display:'flex',gap:8,marginTop:12}}>
                        <button className="btn" onClick={()=>setSelectedInvoice(order)}>🧾 View / Print Invoice</button>
                        <button className="btn o" onClick={()=>window.open(`https://one.instaworld.pk/`, '_blank')}>Track on Insta World</button>
                      </div>
                      {(canCancelOrder(order) || canReturnOrder(order)) && (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          {canCancelOrder(order) && (
                            <button
                              className="btn o"
                              type="button"
                              disabled={busyOrderActionId === order.id}
                              onClick={() =>
                                updateCustomerOrderStatus(order, "cancelled")
                              }
                            >
                              {busyOrderActionId === order.id
                                ? "Updating..."
                                : "Cancel order"}
                            </button>
                          )}
                          {canReturnOrder(order) && (
                            <button
                              className="btn o"
                              type="button"
                              disabled={busyOrderActionId === order.id}
                              onClick={() =>
                                updateCustomerOrderStatus(order, "returned")
                              }
                            >
                              {busyOrderActionId === order.id
                                ? "Updating..."
                                : "Return order"}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : <div><h3>No orders yet</h3><a className="btn" href="/shop">Browse products</a></div>}
            </>
          )}

          {section==="wishlist" && <><h2>My Wishlist</h2>{!ready? <p>Loading...</p> : savedProducts.length? <div className="grid">{savedProducts.map(p=><ProductCard key={p.id} p={p} />)}</div> : <p>Empty</p>}</>}
          {section==="reviews" && (
            <>
              <h2>My Reviews</h2>
              <p>
                Review a product after its order has been marked as delivered.
                Your name and review will be published on the product page.
              </p>
              {reviewsLoading ? (
                <p>Loading reviews...</p>
              ) : reviewsError ? (
                <p style={{ color: "salmon" }}>{reviewsError}</p>
              ) : ordersLoading ? (
                <p>Loading delivered orders...</p>
              ) : (
                <>
                  {ordersError && <p style={{ color: "salmon" }}>{ordersError}</p>}
                  {orders.flatMap((order) => {
                    if (!isDeliveredOrder(order)) return [];
                    return (order.items || []).map((item) => {
                      const reviewKey = `${order.id}_${item.id}`;
                      const savedReview = reviews.find(
                        (review) => review.id === reviewKey,
                      );
                      const draft = reviewDrafts[reviewKey] || {
                        rating: 5,
                        comment: "",
                      };
                      return (
                        <article className="account-order" key={reviewKey}>
                          <h3 style={{ color: "#a3e635" }}>{item.name}</h3>
                          <p>
                            Delivered with order #
                            {order.id.slice(0, 8).toUpperCase()}
                          </p>
                          {savedReview ? (
                            <div>
                              <p aria-label={`${savedReview.rating} out of 5 stars`}>
                                {"★".repeat(savedReview.rating)}
                                {"☆".repeat(5 - savedReview.rating)}
                              </p>
                              <p>{savedReview.comment}</p>
                              <small>Review submitted</small>
                            </div>
                          ) : (
                            <form
                              onSubmit={(event) => {
                                event.preventDefault();
                                submitReview(order, item);
                              }}
                            >
                              <label>
                                Your rating
                                <select
                                  value={draft.rating}
                                  onChange={(event) =>
                                    setReviewDrafts((current) => ({
                                      ...current,
                                      [reviewKey]: {
                                        ...draft,
                                        rating: Number(event.target.value),
                                      },
                                    }))
                                  }
                                >
                                  {[5, 4, 3, 2, 1].map((rating) => (
                                    <option key={rating} value={rating}>
                                      {rating} star{rating === 1 ? "" : "s"}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label style={{ display: "block", margin: "12px 0" }}>
                                Your review
                                <textarea
                                  value={draft.comment}
                                  maxLength={1000}
                                  required
                                  rows={4}
                                  onChange={(event) =>
                                    setReviewDrafts((current) => ({
                                      ...current,
                                      [reviewKey]: {
                                        ...draft,
                                        comment: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="How was your experience with this product?"
                                />
                              </label>
                              <button
                                className="btn"
                                type="submit"
                                disabled={savingReviewKey === reviewKey}
                              >
                                {savingReviewKey === reviewKey
                                  ? "Submitting..."
                                  : "Submit review"}
                              </button>
                            </form>
                          )}
                        </article>
                      );
                    });
                  })}
                  {!ordersError && !orders.some(isDeliveredOrder) && (
                    <p>
                      No delivered products are ready for review yet. You can
                      submit a review here after an order is marked delivered.
                    </p>
                  )}
                </>
              )}
            </>
          )}
          {section==="returns" && (
            <>
              <h2>My Returns &amp; Cancellations</h2>
              <p>
                Orders you have returned or cancelled will appear here.
              </p>
              {orderActionError && <p style={{ color: "salmon" }}>{orderActionError}</p>}
              {ordersLoading ? (
                <p>Loading returns and cancellations...</p>
              ) : ordersError ? (
                <p style={{ color: "salmon" }}>{ordersError}</p>
              ) : orders.filter((order) =>
                  ["returned", "cancelled"].includes(order.status),
                ).length ? (
                orders
                  .filter((order) =>
                    ["returned", "cancelled"].includes(order.status),
                  )
                  .map((order) => (
                    <article className="account-order" key={order.id}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <h3 style={{ color: "#a3e635" }}>
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </h3>
                          <p>{formatOrderDate(order.createdAt)}</p>
                        </div>
                        <span
                          style={{
                            background: order.status === "returned" ? "#facc15" : "#fca5a5",
                            color: "#000",
                            padding: "4px 10px",
                            borderRadius: 20,
                            height: "fit-content",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {order.status === "returned" ? "Returned" : "Cancelled"}
                        </span>
                      </div>
                      <ul style={{ marginTop: 12 }}>
                        {(order.items || []).map((item, index) => (
                          <li
                            className="invoice-line"
                            key={`${item.id || item.name}-${index}`}
                          >
                            <span>{item.name} × {item.qty}</span>
                            <span>{money(item.price * item.qty)}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))
              ) : (
                <p>No returned or cancelled orders yet.</p>
              )}
            </>
          )}
          {message && <p style={{color:'lightgreen'}}>{message}</p>}
          {error && <p style={{color:'salmon'}}>{error}</p>}
        </section>
      </div>

      {selectedInvoice && (
        <div className="invoice-modal" onClick={()=>setSelectedInvoice(null)}>
          <div className="invoice-paper" onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center', borderBottom:'2px solid #111', paddingBottom:12, marginBottom:12}}>
              <h2 style={{margin:0}}>{brand.name}</h2><p style={{margin:0}}>{brand.tagline}</p><small>INVOICE</small>
            </div>
            <div className="invoice-line"><span>Invoice No</span><b>#{selectedInvoice.id.slice(0,8).toUpperCase()}</b></div>
            <div className="invoice-line"><span>Date</span><span>{formatOrderDate(selectedInvoice.createdAt)}</span></div>
            <div className="invoice-line"><span>Customer</span><span>{selectedInvoice.customerName||selectedInvoice.address?.fullName}</span></div>
            <div className="invoice-line"><span>Phone</span><span>{selectedInvoice.phone}</span></div>
            <div className="invoice-line"><span>Address</span><span style={{maxWidth:'55%',textAlign:'right'}}>{[selectedInvoice.address?.building, selectedInvoice.address?.area, selectedInvoice.address?.city, selectedInvoice.address?.province].filter(Boolean).join(", ")}</span></div>
            {selectedInvoice.instaTracking && <div className="invoice-line"><span>Tracking</span><b>{selectedInvoice.instaTracking}</b></div>}
            <h3 style={{margin:'14px 0 6px'}}>Items</h3>
            {(selectedInvoice.items||[]).map((it,i)=><div key={i} className="invoice-line"><span>{it.name} × {it.qty}</span><span>{money(it.price*it.qty)}</span></div>)}
            <div className="invoice-line"><span>Subtotal</span><span>{money(selectedInvoice.subtotal||0)}</span></div>
            <div className="invoice-line"><span>Shipping</span><span>{money(selectedInvoice.shipping||0)}</span></div>
            <div className="invoice-line" style={{fontWeight:900,fontSize:18,borderBottom:'2px solid #111'}}><span>Total COD</span><span>{money(selectedInvoice.total||0)}</span></div>
            <p style={{fontSize:11,textAlign:'center',marginTop:12,opacity:0.6}}>Thank you for shopping at Zee Organic Store! Courier: Insta World<br/>Computer generated invoice</p>
            <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:14}}>
              <button className="btn" onClick={printInvoice}>🖨️ Print</button>
              <button className="btn o" onClick={()=>setSelectedInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}