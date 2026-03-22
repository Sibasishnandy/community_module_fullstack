import { useState, useEffect, useCallback } from "react";
import { Modal, Field } from "../components/UI";
import { SERVER } from "../config";

// ─── Create Room Modal ────────────────────────────────────────────────────────
function CreateRoomModal({ authToken, onCreated, onClose }) {
  const [name, setName]         = useState("");
  const [password, setPassword] = useState("");
  const [maxUsers, setMaxUsers] = useState("50");
  const [error, setError]       = useState("");

  async function submit() {
    try {
      const res = await fetch(`${SERVER}/create`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body:    JSON.stringify({ room_name: name, password, max_users: maxUsers }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      onCreated(data.room_id, data.room_name);
    } catch {
      setError("Server error.");
    }
  }

  return (
    <Modal title="Create Room" onClose={onClose}>
      <Field label="Room Name" type="text" placeholder="e.g. Study Group" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      <Field label="Password (optional)" type="password" placeholder="Leave blank for open room" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field label="Max Users" type="number" min="2" max="200" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
      {error && <span className="rc-error-text">{error}</span>}
      <div className="rc-btn-row">
        <button className="rc-btn rc-btn-secondary rc-btn-sm" onClick={onClose}>Cancel</button>
        <button className="rc-btn rc-btn-primary rc-btn-sm" onClick={submit}>Create</button>
      </div>
    </Modal>
  );
}

// ─── Join Room Modal ──────────────────────────────────────────────────────────
function JoinRoomModal({ authToken, onJoined, onClose }) {
  const [roomId, setRoomId]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  async function submit() {
    if (!roomId.trim()) { setError("Enter a room ID."); return; }
    try {
      const res = await fetch(`${SERVER}/join`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body:    JSON.stringify({ room_id: roomId.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      onJoined(data.room_id, data.room_name);
    } catch {
      setError("Could not connect to server.");
    }
  }

  return (
    <Modal title="Join a Room" onClose={onClose}>
      <Field label="Room ID" type="text" placeholder="6-digit room code" maxLength={6} autoComplete="off" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <Field label="Password (if required)" type="password" placeholder="Leave blank if open" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <span className="rc-error-text">{error}</span>}
      <div className="rc-btn-row">
        <button className="rc-btn rc-btn-secondary rc-btn-sm" onClick={onClose}>Cancel</button>
        <button className="rc-btn rc-btn-teal rc-btn-sm" onClick={submit}>Join</button>
      </div>
    </Modal>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export function DashboardScreen({ currentUser, authToken, onEnterRoom, onLogout, showToast }) {
  const [rooms, setRooms]           = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]     = useState(false);

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization:  `Bearer ${authToken}`,
  });

  const loadRooms = useCallback(async () => {
    setRooms(null);
    try {
      const res  = await fetch(`${SERVER}/rooms/${currentUser}`, { headers: headers() });
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setRooms([]);
    }
  }, [currentUser, authToken]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  async function leaveRoom(room_id) {
    try {
      await fetch(`${SERVER}/room/${room_id}/leave`, {
        method:  "POST",
        headers: headers(),
      });
      showToast("Left room");
      loadRooms();
    } catch {
      showToast("Failed to leave room", true);
    }
  }

  return (
    <div className="rc-screen rc-dash">
      <div className="rc-dash-inner">
        <div className="rc-dash-header">
          <div className="rc-dash-title">My Rooms</div>
          <button className="rc-back-link" onClick={onLogout}>Sign out</button>
        </div>
        <div className="rc-dash-sub">@{currentUser}</div>

        {rooms === null && <div className="rc-loading">Loading rooms…</div>}

        {rooms !== null && rooms.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)" }}>
            🕳️ No rooms yet — create or join one!
          </div>
        )}

        {rooms !== null &&
          rooms.map((room) => (
            <div className="rc-room-card" key={room.room_id}>
              <div>
                <div className="rc-room-card-name">{room.room_name || "Unnamed Room"}</div>
                <div className="rc-room-card-id">{room.room_id}</div>
                <div className="rc-room-card-meta">
                  {room.users.length} member{room.users.length !== 1 ? "s" : ""} ·{" "}
                  {room.users.slice(0, 3).join(", ")}
                  {room.users.length > 3 ? "…" : ""}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <button
                  className="rc-btn rc-btn-primary rc-btn-sm"
                  onClick={() => onEnterRoom(room.room_id, room.room_name || room.room_id)}
                >
                  Enter →
                </button>
                <button
                  style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => leaveRoom(room.room_id)}
                >
                  leave room
                </button>
              </div>
            </div>
          ))}

        <div className="rc-dash-actions">
          <button className="rc-btn rc-btn-primary" style={{ flex: 1 }} onClick={() => setShowCreate(true)}>
            + Create Room
          </button>
          <button className="rc-btn rc-btn-secondary" style={{ flex: 1 }} onClick={() => setShowJoin(true)}>
            Join Room
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateRoomModal
          authToken={authToken}
          onCreated={(id, name) => { setShowCreate(false); onEnterRoom(id, name, true); }}
          onClose={() => setShowCreate(false)}
        />
      )}
      {showJoin && (
        <JoinRoomModal
          authToken={authToken}
          onJoined={(id, name) => { setShowJoin(false); onEnterRoom(id, name); }}
          onClose={() => setShowJoin(false)}
        />
      )}
    </div>
  );
}
