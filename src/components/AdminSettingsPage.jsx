import { useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase.js";

export default function AdminSettingsPage({ user }) {
  const [name, setName] = useState(user.displayName || "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const snapshot = await getDoc(doc(db, "adminProfiles", user.uid));
        if (!active) return;
        if (snapshot.exists()) {
          const profile = snapshot.data();
          setName(profile.name || user.displayName || "");
          setPhone(profile.phone || "");
        } else {
          setName(user.displayName || "");
          setPhone("");
        }
      } catch (loadError) {
        console.error("Unable to load admin settings.", loadError);
        if (active) {
          setError(
            loadError.code === "permission-denied"
              ? "Firebase denied profile access. Add the admin profile rule described in README.md."
              : loadError.message || "Unable to load admin settings.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter your admin name.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await setDoc(doc(db, "adminProfiles", user.uid), {
        name: trimmedName,
        phone: phone.trim(),
        updatedAt: new Date(),
      });
      setName(trimmedName);
      setNotice("Admin information saved.");
    } catch (saveError) {
      console.error("Unable to save admin settings.", saveError);
      setError(
        saveError.code === "permission-denied"
          ? "Firebase denied profile access. Add the admin profile rule described in README.md."
          : saveError.message || "Unable to save admin settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!user.email) {
      setError("There is no sign-in email on this admin account.");
      return;
    }
    setResetting(true);
    setError("");
    setNotice("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setNotice(`Password reset email sent to ${user.email}.`);
    } catch (resetError) {
      console.error("Unable to send admin password reset email.", resetError);
      setError(resetError.message || "Unable to send the password reset email.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="admin-settings">
      <div className="admin-panel-heading">
        <div>
          <h2>Admin information</h2>
          <p>Manage the contact details associated with your store administration account.</p>
        </div>
      </div>

      {error && <div className="admin-alert" role="alert">{error}</div>}
      {notice && <div className="admin-notice" role="status">{notice}</div>}

      <form className="admin-settings-form" onSubmit={saveProfile}>
        <div className="admin-settings-section-heading">
          <span className="admin-settings-icon">♙</span>
          <div>
            <h3>Profile information</h3>
            <p>This information is only available in the admin panel.</p>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty">Loading admin information…</div>
        ) : (
          <div className="admin-settings-fields">
            <label>
              Admin name
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                required
              />
            </label>
            <label>
              Contact phone number
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Enter a contact phone number"
              />
            </label>
            <label>
              Sign-in email
              <input value={user.email || ""} readOnly />
              <small>Email changes must be made through Firebase Authentication.</small>
            </label>
            <div className="admin-settings-verification">
              <span>Email verification</span>
              <strong className={user.emailVerified ? "verified" : "not-verified"}>
                <i aria-hidden="true">{user.emailVerified ? "✓" : "!"}</i>
                {user.emailVerified ? "Verified" : "Not verified"}
              </strong>
            </div>
          </div>
        )}

        <div className="admin-settings-footer">
          <p>Your phone number is saved securely in the store’s admin profile.</p>
          <button className="admin-primary-button" type="submit" disabled={loading || saving}>
            {saving ? "Saving…" : "Save information"}
          </button>
        </div>
      </form>

      <section className="admin-security-card">
        <div>
          <span className="admin-settings-icon">⌑</span>
          <div>
            <h3>Password and security</h3>
            <p>Send a password reset link to your admin sign-in email.</p>
          </div>
        </div>
        <button
          className="admin-refresh-button"
          type="button"
          onClick={sendPasswordReset}
          disabled={resetting || !user.email}
        >
          {resetting ? "Sending…" : "Send password reset"}
        </button>
      </section>
    </section>
  );
}
