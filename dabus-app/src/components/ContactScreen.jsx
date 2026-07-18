import { useState } from "react";
import styles from "./ContactScreen.module.css";
import BackButton from "./BackButton";
import { API_BASE, APP_VERSION } from "../constants";

const MIN_MESSAGE = 10;
const MAX_MESSAGE = 1000;
const CATEGORIES = [
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Idea" },
  { id: "other", label: "Other" },
];

// Contact form, reached from Settings → Help → "Contact / Send feedback".
// Closing it (on-screen back or system back) is handled in App.jsx via
// contactView, mirroring faqView.
function ContactScreen({ onBack }) {
  const [category, setCategory] = useState("other");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  // Honeypot — humans never see this field; bots auto-fill every input.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const trimmed = message.trim();
  const tooShort = trimmed.length < MIN_MESSAGE;

  const submit = async (e) => {
    e.preventDefault();
    if (status === "sending" || tooShort) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: trimmed,
          email: email.trim(),
          website,
          appVersion: APP_VERSION,
          platform: navigator.userAgent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "Could not send your message. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setErrorMsg("Could not send your message — check your connection and try again.");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <BackButton onClick={onBack} label="Back to settings" />
          <h2 className={styles.title}>Contact</h2>
        </div>
        <div className={styles.group}>
          <div className={styles.sentBlock} role="status">
            <p className={styles.sentTitle}>Message sent — thanks!</p>
            <p className={styles.sentSub}>
              {email.trim()
                ? "If a response is needed, you'll hear back at the email you provided."
                : "Your feedback helps make DaBus better."}
            </p>
            <button type="button" className={styles.doneBtn} onClick={onBack}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BackButton onClick={onBack} label="Back to settings" />
        <h2 className={styles.title}>Contact</h2>
      </div>

      <form className={styles.section} onSubmit={submit}>
        <div className={styles.group}>
          <div className={styles.fieldBlock}>
            <p id="contact-cat-label" className={styles.fieldLabel}>Topic</p>
            <div className={styles.seg} role="group" aria-labelledby="contact-cat-label">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.segBtn} ${category === c.id ? styles.segActive : ""}`}
                  onClick={() => setCategory(c.id)}
                  aria-pressed={category === c.id}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.fieldBlock}>
            <div className={styles.labelRow}>
              <label htmlFor="contact-message" className={styles.fieldLabel}>
                Message
              </label>
              <span
                id="contact-counter"
                className={MAX_MESSAGE - message.length <= 50 ? styles.counterLow : styles.counter}
              >
                {message.length}/{MAX_MESSAGE}
              </span>
            </div>
            <textarea
              id="contact-message"
              className={styles.textarea}
              value={message}
              maxLength={MAX_MESSAGE}
              rows={5}
              required
              placeholder="What's on your mind? For bugs, include the stop or route if you can."
              aria-describedby="contact-counter"
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className={styles.divider} />

          <div className={styles.fieldBlock}>
            <label htmlFor="contact-email" className={styles.fieldLabel}>
              Email <span className={styles.optional}>(optional — only if you'd like a reply)</span>
            </label>
            <input
              id="contact-email"
              className={styles.input}
              type="email"
              value={email}
              maxLength={254}
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Honeypot: visually removed and skipped by keyboard/screen readers. */}
          <div className={styles.trap} aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
        </div>

        <p className={styles.disclosure}>
          Your app version ({APP_VERSION}) and device type are included automatically to help
          with debugging.
        </p>

        {status === "error" && (
          <p className={styles.error} role="alert">
            {errorMsg}
          </p>
        )}

        <button type="submit" className={styles.submitBtn} disabled={tooShort || status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        {tooShort && trimmed.length > 0 && (
          <p className={styles.hint}>A few more characters, please ({MIN_MESSAGE} minimum).</p>
        )}
      </form>
    </div>
  );
}

export default ContactScreen;
