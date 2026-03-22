export function MembersPanel({ members, currentUser }) {
  return (
    <div className="rc-members-panel">
      <div className="rc-members-label">MEMBERS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {members.users.map((user) => (
          <div key={user} className="rc-member-chip">
            {user === currentUser ? "🟢" : "⚪"} {user}
            {user === members.created_by ? " 👑" : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
