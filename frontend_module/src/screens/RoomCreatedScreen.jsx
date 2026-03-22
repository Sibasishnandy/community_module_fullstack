export function RoomCreatedScreen({ roomId, onEnter, onBack }) {
  return (
    <div className="rc-screen" style={{ flexDirection: "column", gap: 20 }}>
      <div className="rc-created-card">
        <h3>Room Created 🎉</h3>
        <div className="rc-big-room-id">{roomId}</div>
        <p style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--mono)" }}>
          Share this code with friends
        </p>
        <button className="rc-btn rc-btn-teal" onClick={onEnter}>
          Enter Chat →
        </button>
      </div>
      <button className="rc-back-link" onClick={onBack}>
        ← Dashboard
      </button>
    </div>
  );
}
