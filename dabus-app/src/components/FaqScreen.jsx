import { useState } from "react";
import styles from "./FaqScreen.module.css";
import BackButton from "./BackButton";
import FAQ_SECTIONS from "./faqData";

// Dedicated FAQ screen, reached from Settings → "Frequently Asked Questions".
// Closing it (on-screen back or system back) is handled in App.jsx via faqView.
function FaqScreen({ onBack }) {
  // Key of the currently open question, "sectionIndex-itemIndex" (one open at a time).
  const [open, setOpen] = useState(null);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BackButton onClick={onBack} label="Back to settings" />
        <h2 className={styles.title}>Frequently Asked Questions</h2>
      </div>

      {FAQ_SECTIONS.map((section, si) => (
        <div key={si} className={styles.section}>
          <p className={styles.sectionLabel}>{section.title}</p>
          <div className={styles.group}>
            {section.items.map((item, i) => {
              const key = `${si}-${i}`;
              return (
                <div key={key}>
                  {i > 0 && <div className={styles.divider} />}
                  <button
                    className={styles.faqQuestion}
                    onClick={() => setOpen(open === key ? null : key)}
                    aria-expanded={open === key}
                  >
                    <span>{item.q}</span>
                    <svg
                      className={`${styles.faqChevron} ${open === key ? styles.faqChevronOpen : ""}`}
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
                  {open === key && <p className={styles.faqAnswer}>{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default FaqScreen;
