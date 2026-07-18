import { useRef, useEffect } from "react";

function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  const modalRef = useRef(null);
  const cancelRef = useRef(null);

  // Focus lands on Cancel (the safe default for a destructive action), Tab is
  // trapped inside the dialog, Escape cancels, and focus is restored on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    cancelRef.current?.focus();

    const handleKey = (e) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = modalRef.current?.querySelectorAll(
        'button, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [onCancel]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        ref={modalRef}
        style={{
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          padding: "24px",
          borderRadius: "12px",
          width: "300px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <p id="confirm-dialog-title" style={{ fontSize: "16px", fontWeight: 500, margin: 0 }}>
          {title}
        </p>
        <p id="confirm-dialog-message" style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            type="button"
            ref={cancelRef}
            onClick={onCancel}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text-muted)",
              fontSize: "14px",
              padding: "8px 16px",
              minHeight: "44px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: "var(--danger)",
              border: "none",
              borderRadius: "8px",
              color: "var(--bg)", // theme-safe: 6.4:1 on both --danger values
              fontSize: "14px",
              padding: "8px 16px",
              minHeight: "44px",
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
