import { useState } from "react";
import styles from "./FaqScreen.module.css";
import BackButton from "./BackButton";
import FAQ_ITEMS from "./faqData";

// Dedicated FAQ screen, reached from Settings → "Frequently asked questions".
// Closing it (on-screen back or system back) is handled in App.jsx via faqView.
function FaqScreen({ onBack }) {
  const [open, setOpen] = useState(null);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BackButton onClick={onBack} label="Back to settings" />
        <h2 className={styles.title}>Frequently Asked Questions</h2>
      </div>
      <div className={styles.group}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i}>
            {i > 0 && <div className={styles.divider} />}
            <button
              className={styles.faqQuestion}
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span>{item.q}</span>
              <svg
                className={`${styles.faqChevron} ${open === i ? styles.faqChevronOpen : ""}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {open === i && <p className={styles.faqAnswer}>{item.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FaqScreen;
