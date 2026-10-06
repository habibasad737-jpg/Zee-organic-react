import { useEffect, useMemo, useState } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase.js";
import { money } from "../config.js";
import { useAuth } from "../context/auth.jsx";
import AdminCatalogPage from "./AdminCatalogPage.jsx";
import AdminSettingsPage from "./AdminSettingsPage.jsx";
import SignInModal from "./SignInModal.jsx";

const ADMIN_EMAIL = "khansher7377@gmail.com";
const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
];

const orderDate = (createdAt) => {
  const date = createdAt?.toDate?.();
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Date unavailable";
};

const statusLabel = (status) =>
  String(status || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const orderAddress = (address) =>
  [
    address?.building,
    address?.area,
    address?.locality,
    address?.city,
    address?.province,
  ]
    .filter(Boolean)
    .join(", ");

const firebaseError = (error) => {
  if (error?.code === "permission-denied") {
    return "Firebase denied access. Add the admin and customer order rules described in README.md.";
  }
  return error?.message || "Something went wrong. Please try again.";
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signInOpen, setSignInOpen] = useState(false);
  const [activeView, setActiveView] = useState("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busyOrderId, setBusyOrderId] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  const loadOrders = async () => {
    setOrdersLoading(true);
    setError("");
    try {
      const snapshot = await getDocs(collection(db, "orders"));
      const list = snapshot.docs.map((orderDoc) => ({
        id: orderDoc.id,
        ...orderDoc.data(),
      }));
      list.sort(
        (first, second) =>
          (second.createdAt?.toMillis?.() ?? 0) -
          (first.createdAt?.toMillis?.() ?? 0),
      );
      setOrders(list);
    } catch (loadError) {
      console.error("Unable to load admin orders.", loadError);
      setError(firebaseError(loadError));
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && user.emailVerified) loadOrders();
  }, [isAdmin, user?.emailVerified]);

  useEffect(() => {
    setTrackingNumber(selectedOrder?.instaTracking || "");
  }, [selectedOrder?.id, selectedOrder?.instaTracking]);

  const filteredOrders = useMemo(() => {
    const queryText = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ||
        String(order.status || "pending").toLowerCase() === statusFilter;
      const matchesSearch =
        !queryText ||
        [
          order.id,
          order.customerName,
          order.email,
          order.phone,
          order.address?.city,
        ].some((value) => String(value || "").toLowerCase().includes(queryText));
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const count = (status) =>
      orders.filter(
        (order) => String(order.status || "pending").toLowerCase() === status,
      ).length;
    return [
      { label: "Total orders", value: orders.length, color: "blue" },
      { label: "Awaiting fulfilment", value: count("pending"), color: "amber" },
      {
        label: "In progress",
        value: count("processing") + count("shipped"),
        color: "violet",
      },
      { label: "Delivered", value: count("delivered"), color: "green" },
      { label: "Returns", value: count("returned"), color: "red" },
      {
        label: "COD collected",
        value: money(
          orders
            .filter(
              (order) =>
                String(order.status || "").toLowerCase() === "delivered",
            )
            .reduce((total, order) => total + Number(order.total || 0), 0),
        ),
        color: "teal",
      },
    ];
  }, [orders]);

  const updateOrder = async (order, changes) => {
    setBusyOrderId(order.id);
    setError("");
    setNotice("");
    try {
      await updateDoc(doc(db, "orders", order.id), changes);
      const updatedOrder = { ...order, ...changes };
      setOrders((current) =>
        current.map((item) => (item.id === order.id ? updatedOrder : item)),
      );
      setSelectedOrder((current) =>
        current?.id === order.id ? updatedOrder : current,
      );
      setNotice(`Order #${order.id.slice(0, 8).toUpperCase()} updated.`);
    } catch (updateError) {
      console.error("Unable to update the order.", updateError);
      setError(firebaseError(updateError));
    } finally {
      setBusyOrderId("");
    }
  };

  const saveTrackingNumber = async (event) => {
    event.preventDefault();
    if (!selectedOrder || busyOrderId) return;
    await updateOrder(selectedOrder, { instaTracking: trackingNumber.trim() });
  };

  const verifyEmail = async () => {
    if (!auth.currentUser) return;
    setBusyAction(true);
    setError("");
    setNotice("");
    try {
      await sendEmailVerification(auth.currentUser);
      setNotice("Verification email sent. Verify your address, then sign in again.");
    } catch (verificationError) {
      console.error("Unable to send admin email verification.", verificationError);
      setError(firebaseError(verificationError));
    } finally {
      setBusyAction(false);
    }
  };

  const logOut = async () => {
    setBusyAction(true);
    setError("");
    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error("Unable to sign out from the admin panel.", signOutError);
      setError(firebaseError(signOutError));
    } finally {
      setBusyAction(false);
    }
  };

  if (loading) {
    return (
      <main className="admin-gate">
        <div className="admin-gate-card">Checking administrator access…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="admin-gate">
        <section className="admin-gate-card">
          <a className="admin-brand" href="/" aria-label="Zee Organic home">
            <img src="/images/logo.png" alt="" />
            <span>Zee Organic <small>ADMINISTRATION</small></span>
          </a>
          <h1>Admin sign in</h1>
          <p>Sign in with the authorized administrator account to manage orders.</p>
          <button className="admin-primary-button" onClick={() => setSignInOpen(true)}>
            Sign in
          </button>
          <a className="admin-back-link" href="/">Return to store</a>
        </section>
        <SignInModal
          open={signInOpen}
          onClose={() => setSignInOpen(false)}
          onSuccess={() => setSignInOpen(false)}
        />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-gate">
        <section className="admin-gate-card">
          <span className="admin-gate-icon">!</span>
          <h1>Administrator access only</h1>
          <p>
            <strong>{user.email || "This account"}</strong> is not authorized to
            manage store orders.
          </p>
          {error && <p className="admin-alert">{error}</p>}
          <button
            className="admin-primary-button"
            onClick={logOut}
            disabled={busyAction}
          >
            {busyAction ? "Signing out…" : "Sign out"}
          </button>
          <a className="admin-back-link" href="/">Return to store</a>
        </section>
      </main>
    );
  }

  if (!user.emailVerified) {
    return (
      <main className="admin-gate">
        <section className="admin-gate-card">
          <span className="admin-gate-icon">✉</span>
          <h1>Verify your admin email</h1>
          <p>
            Verify <strong>{user.email}</strong> before opening customer orders.
            This protects access to private order information.
          </p>
          {notice && <p className="admin-notice">{notice}</p>}
          {error && <p className="admin-alert">{error}</p>}
          <button
            className="admin-primary-button"
            onClick={verifyEmail}
            disabled={busyAction}
          >
            {busyAction ? "Sending…" : "Send verification email"}
          </button>
          <button className="admin-text-button" onClick={logOut} disabled={busyAction}>
            Sign out and sign in again after verification
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="Zee Organic home">
          <img src="/images/logo.png" alt="" />
          <span>Zee Organic <small>ADMINISTRATION</small></span>
        </a>
        <div className="admin-side-label">WORKSPACE</div>
        <button
          className={`admin-nav-item ${activeView === "overview" ? "active" : ""}`}
          onClick={() => setActiveView("overview")}
        >
          <span>▦</span> Overview
        </button>
        <button
          className={`admin-nav-item ${activeView === "orders" ? "active" : ""}`}
          onClick={() => setActiveView("orders")}
        >
          <span>▤</span> Orders <b>{orders.length}</b>
        </button>
        <button
          className={`admin-nav-item ${activeView === "catalog" ? "active" : ""}`}
          onClick={() => setActiveView("catalog")}
        >
          <span>▧</span> Products & categories
        </button>
        <button
          className={`admin-nav-item ${activeView === "settings" ? "active" : ""}`}
          onClick={() => setActiveView("settings")}
        >
          <span>⚙</span> Settings
        </button>
        <div className="admin-sidebar-bottom">
          <div className="admin-user-chip">
            <span className="admin-avatar">{user.email?.[0]?.toUpperCase() || "A"}</span>
            <span>{user.email}<small>Administrator</small></span>
          </div>
          <button className="admin-signout" onClick={logOut} disabled={busyAction}>
            ↪ Sign out
          </button>
          <a href="/" className="admin-store-link">← Back to store</a>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">ZEE ORGANIC STORE</span>
            <h1>
              {activeView === "overview"
                ? "Dashboard"
                : activeView === "orders"
                  ? "Orders"
                  : activeView === "catalog"
                    ? "Products & categories"
                    : "Settings"}
            </h1>
          </div>
          <button
            className="admin-refresh-button"
            onClick={loadOrders}
            disabled={ordersLoading}
          >
            {ordersLoading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </header>

        <div className="admin-content">
          {error && <div className="admin-alert" role="alert">{error}</div>}
          {notice && <div className="admin-notice" role="status">{notice}</div>}

          {activeView === "overview" && (
            <>
              <div className="admin-welcome">
                <div>
                  <h2>Welcome back</h2>
                  <p>Here’s what’s happening with your store today.</p>
                </div>
                <button
                  className="admin-primary-button"
                  onClick={() => setActiveView("orders")}
                >
                  View all orders <span>→</span>
                </button>
              </div>

              <section className="admin-stat-grid" aria-label="Order metrics">
                {stats.map((stat) => (
                  <article className="admin-stat-card" key={stat.label}>
                    <span className={`admin-stat-icon ${stat.color}`}>▣</span>
                    <span className="admin-stat-label">{stat.label}</span>
                    <strong>{stat.value}</strong>
                    <small>All time</small>
                  </article>
                ))}
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>Recent orders</h2>
                    <p>Latest orders placed by your customers</p>
                  </div>
                  <button className="admin-link-button" onClick={() => setActiveView("orders")}>
                    See all
                  </button>
                </div>
                {ordersLoading ? (
                  <div className="admin-empty">Loading orders…</div>
                ) : orders.length ? (
                  <OrderTable
                    orders={orders.slice(0, 5)}
                    busyOrderId={busyOrderId}
                    onSelect={setSelectedOrder}
                    onStatusChange={updateOrder}
                  />
                ) : (
                  <div className="admin-empty">Orders placed in your store will appear here.</div>
                )}
              </section>
            </>
          )}

          {activeView === "orders" && (
            <section className="admin-panel admin-orders-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>All orders</h2>
                  <p>Review customer details and keep order fulfilment up to date.</p>
                </div>
              </div>
              <div className="admin-order-filters">
                <label className="admin-search">
                  <span>⌕</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search order, customer, phone…"
                  />
                </label>
                <label className="admin-status-filter">
                  <span>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>{statusLabel(status)}</option>
                    ))}
                  </select>
                </label>
              </div>
              {ordersLoading ? (
                <div className="admin-empty">Loading orders…</div>
              ) : filteredOrders.length ? (
                <OrderTable
                  orders={filteredOrders}
                  busyOrderId={busyOrderId}
                  onSelect={setSelectedOrder}
                  onStatusChange={updateOrder}
                />
              ) : (
                <div className="admin-empty">
                  {orders.length ? "No orders match these filters." : "No orders have been placed yet."}
                </div>
              )}
            </section>
          )}

          {activeView === "catalog" && <AdminCatalogPage />}
          {activeView === "settings" && <AdminSettingsPage user={user} />}
        </div>
      </section>

      {selectedOrder && (
        <div className="admin-drawer-backdrop" onClick={() => setSelectedOrder(null)}>
          <aside
            className="admin-order-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-drawer-heading">
              <div>
                <span className="admin-eyebrow">ORDER DETAILS</span>
                <h2 id="admin-order-title">
                  #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h2>
              </div>
              <button
                className="admin-close-button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >×</button>
            </div>
            <p className="admin-drawer-date">{orderDate(selectedOrder.createdAt)}</p>
            <div className="admin-detail-section">
              <h3>Order status</h3>
              <select
                className="admin-detail-select"
                value={selectedOrder.status || "pending"}
                disabled={busyOrderId === selectedOrder.id}
                onChange={(event) =>
                  updateOrder(selectedOrder, { status: event.target.value })
                }
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
            </div>
            <div className="admin-detail-section">
              <h3>Customer</h3>
              <p>{selectedOrder.customerName || "Name not provided"}</p>
              {selectedOrder.email && <a href={`mailto:${selectedOrder.email}`}>{selectedOrder.email}</a>}
              {selectedOrder.phone && <a href={`tel:${selectedOrder.phone}`}>{selectedOrder.phone}</a>}
              <p className="admin-address">{orderAddress(selectedOrder.address) || "Address not provided"}</p>
            </div>
            <div className="admin-detail-section">
              <h3>Items</h3>
              {(selectedOrder.items || []).map((item, index) => (
                <div className="admin-item-line" key={`${item.id || item.name}-${index}`}>
                  <span>{item.name} <small>× {item.qty}</small></span>
                  <strong>{money(Number(item.price || 0) * Number(item.qty || 0))}</strong>
                </div>
              ))}
              <div className="admin-item-line"><span>Subtotal</span><span>{money(Number(selectedOrder.subtotal || 0))}</span></div>
              <div className="admin-item-line"><span>Shipping</span><span>{money(Number(selectedOrder.shipping || 0))}</span></div>
              <div className="admin-item-line admin-total-line"><strong>COD total</strong><strong>{money(Number(selectedOrder.total || 0))}</strong></div>
            </div>
            <form className="admin-detail-section" onSubmit={saveTrackingNumber}>
              <label htmlFor="admin-tracking"><h3>Courier tracking number</h3></label>
              <div className="admin-tracking-form">
                <input
                  id="admin-tracking"
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="Enter tracking number"
                />
                <button
                  className="admin-primary-button"
                  type="submit"
                  disabled={busyOrderId === selectedOrder.id}
                >
                  Save
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}

function OrderTable({ orders, busyOrderId, onSelect, onStatusChange }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
            <th aria-label="Details" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <button className="admin-order-id" onClick={() => onSelect(order)}>
                  #{order.id.slice(0, 8).toUpperCase()}
                </button>
                <small>{order.count || order.items?.length || 0} items</small>
              </td>
              <td>
                <strong>{order.customerName || "Customer"}</strong>
                <small>{order.phone || order.email || "Contact unavailable"}</small>
              </td>
              <td>{orderDate(order.createdAt)}</td>
              <td className="admin-money">{money(Number(order.total || 0))}</td>
              <td>
                <select
                  className={`admin-status-select status-${String(order.status || "pending").toLowerCase()}`}
                  value={order.status || "pending"}
                  aria-label={`Update status for order ${order.id}`}
                  disabled={busyOrderId === order.id}
                  onChange={(event) =>
                    onStatusChange(order, { status: event.target.value })
                  }
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>{statusLabel(status)}</option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  className="admin-row-action"
                  onClick={() => onSelect(order)}
                  aria-label={`View order ${order.id}`}
                >→</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
