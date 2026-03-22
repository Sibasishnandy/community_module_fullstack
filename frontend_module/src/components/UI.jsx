// ─── Toast ───────────────────────────────────────────────────────────────────
export function Toast({ message, isError }) {
  return (
    <div
      className={`rc-toast ${message ? "rc-toast-show" : ""}`}
      style={isError ? { borderColor: "var(--accent)" } : {}}
    >
      {message}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  return (
    <div
      className="rc-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rc-modal">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ─── Field (labelled input) ───────────────────────────────────────────────────
export function Field({ label, ...props }) {
  return (
    <div className="rc-field">
      <label>{label}</label>
      <input {...props} />
    </div>
  );
}
