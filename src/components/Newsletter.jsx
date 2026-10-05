import { useState } from "react";
export default function Newsletter() {
  const [email, setEmail] = useState(""),
    [msg, setMsg] = useState("");
  const submit = (e) => {
    e.preventDefault();
    setMsg(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? "Thanks! This is a demo, so no email was sent. Newsletter API placeholder."
        : "Enter a valid email address, like name@example.com.",
    );
  };
  return (
    <section className="nl">
      <h2>Brew something good</h2>
      <form onSubmit={submit} noValidate>
        <label className="sr" htmlFor="em">
          Email address
        </label>
        <input
          id="em"
          type="email"
          autoComplete="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn" type="submit">
          Subscribe
        </button>
      </form>
      <p id="msg" role="status">
        {msg}
      </p>
    </section>
  );
}
