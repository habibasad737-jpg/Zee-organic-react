import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase.js";

const authErrorMessage = (error) => {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account already exists for this email. Log in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Choose a password with at least 8 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect. Use the email address you registered with, not your name.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a while and try again.";
    case "auth/invalid-phone-number":
      return "Enter a valid phone number with its country code.";
    case "auth/invalid-verification-code":
      return "That verification code is incorrect. Check it and try again.";
    case "auth/code-expired":
      return "That verification code has expired. Request a new code.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase yet.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return error.message || "Authentication failed. Please try again.";
  }
};

export default function SignInModal({ open, onClose, onSuccess }) {
  const [method, setMethod] = useState("password");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);
  const recaptchaContainer = useRef(null);
  const recaptchaVerifier = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      recaptchaVerifier.current?.clear();
      recaptchaVerifier.current = null;
    };
  }, [open, onClose]);

  if (!open) return null;

  const changeMethod = (nextMethod) => {
    recaptchaVerifier.current?.clear();
    recaptchaVerifier.current = null;
    setPhoneConfirmation(null);
    setMethod(nextMethod);
    setMessage("");
  };

  const toggleSignUp = () => {
    recaptchaVerifier.current?.clear();
    recaptchaVerifier.current = null;
    setPhoneConfirmation(null);
    setIsSignUp((current) => !current);
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          String(form.get("email")).trim(),
          String(form.get("new-password")),
        );
        await updateProfile(credential.user, {
          displayName: String(form.get("name")).trim(),
        });
        onSuccess?.(credential.user);
        return;
      }

      if (method === "password") {
        const identity = String(form.get("email")).trim().toLowerCase();
        if (!identity.includes("@")) {
          setMessage(
            "Enter the email address you used to create your account. Your name is not a login ID. For SMS sign-in, choose Phone Number.",
          );
          return;
        }
        const credential = await signInWithEmailAndPassword(
          auth,
          identity,
          String(form.get("password")),
        );
        onSuccess?.(credential.user);
        return;
      }

      if (!phoneConfirmation) {
        const phoneNumber = String(form.get("tel")).trim();
        if (!recaptchaVerifier.current) {
          recaptchaVerifier.current = new RecaptchaVerifier(
            auth,
            recaptchaContainer.current,
            { size: "normal" },
          );
        }
        const confirmation = await signInWithPhoneNumber(
          auth,
          phoneNumber,
          recaptchaVerifier.current,
        );
        setPhoneConfirmation(confirmation);
        setMessage("Verification code sent. Enter the code from your SMS.");
        return;
      }

      const credential = await phoneConfirmation.confirm(
        String(form.get("one-time-code")).trim(),
      );
      onSuccess?.(credential.user);
    } catch (error) {
      setMessage(authErrorMessage(error));
      if (method === "phone" && !isSignUp) {
        recaptchaVerifier.current?.clear();
        recaptchaVerifier.current = null;
      }
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const email = document.getElementById("signin-email")?.value.trim();
    if (!email || !email.includes("@")) {
      setMessage("Enter your account email first to reset your password.");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="signin-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="signin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-title"
      >
        <div className="signin-heading">
          <h2 id="signin-title">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          <button
            className="signin-close"
            type="button"
            onClick={onClose}
            aria-label="Close sign-in"
          >
            ×
          </button>
        </div>

        {!isSignUp && (
          <div
            className="signin-tabs"
            role="tablist"
            aria-label="Sign-in method"
          >
            <button
              type="button"
              role="tab"
              aria-selected={method === "password"}
              className={method === "password" ? "active" : ""}
              onClick={() => changeMethod("password")}
            >
              Password
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === "phone"}
              className={method === "phone" ? "active" : ""}
              onClick={() => changeMethod("phone")}
            >
              Phone Number
            </button>
          </div>
        )}

        <form className="signin-form" onSubmit={submit}>
          {isSignUp ? (
            <>
              <label className="sr" htmlFor="signup-name">
                Full name
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Please enter your full name"
                required
                autoFocus
              />
              <label className="sr" htmlFor="signup-email">
                Email address
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Please enter your email"
                required
              />
              <label className="sr" htmlFor="signup-password">
                Create a password
              </label>
              <input
                id="signup-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a password"
                minLength={8}
                required
              />
            </>
          ) : method === "password" ? (
            <>
              <label className="sr" htmlFor="signin-email">
                Email address
              </label>
              <input
                id="signin-email"
                name="email"
                type="text"
                autoComplete="email"
                placeholder="Email address used to create your account"
                required
                autoFocus
              />
              <div className="signin-password-field">
                <label className="sr" htmlFor="signin-password">
                  Password
                </label>
                <input
                  id="signin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Please enter your password"
                  required
                />
                <button
                  type="button"
                  className="signin-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <button
                type="button"
                className="signin-forgot"
                onClick={resetPassword}
              >
                Forgot password?
              </button>
            </>
          ) : (
            <>
              <label className="sr" htmlFor="signin-phone">
                Phone number
              </label>
              <input
                id="signin-phone"
                name="tel"
                type="tel"
                autoComplete="tel"
                placeholder="Phone number with country code (e.g. +91...)"
                required
                autoFocus
              />
              <label className="sr" htmlFor="signin-code">
                Verification code
              </label>
              <input
                id="signin-code"
                name="one-time-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Please enter your verification code"
                required
                disabled={!phoneConfirmation}
              />
            </>
          )}

          <button className="btn signin-submit" type="submit" disabled={busy}>
            {busy
              ? "Please wait..."
              : isSignUp
                ? "Create account"
                : method === "phone" && !phoneConfirmation
                  ? "Send verification code"
                  : method === "phone"
                    ? "Verify and sign in"
                    : "Login"}
          </button>
        </form>
        {!isSignUp && method === "phone" && (
          <div
            className="signin-recaptcha"
            ref={recaptchaContainer}
            aria-label="Phone verification security check"
          />
        )}

        <p className="signin-switch">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button type="button" onClick={toggleSignUp}>
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>
        <p className="signin-status" role="status" aria-live="polite">
          {message}
        </p>
        <p className="signin-demo-note">
          Your account is securely managed by Firebase Authentication.
        </p>
      </section>
    </div>
  );
}
