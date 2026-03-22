import { EMOJIS } from "../config";

export function MessageItem({
  msg,
  currentUser,
  onReact,
  onDelete,
  openPickerId,
  setOpenPickerId,
}) {
  const { id, author, text, type, reactions = {} } = msg;
  const isOpen = openPickerId === id;

  if (type === "system") {
    return (
      <div className="rc-msg rc-msg-system">
        <div className="rc-msg-bubble">{text}</div>
      </div>
    );
  }

  return (
    <div className={`rc-msg rc-msg-${type}`}>
      {author && <div className="rc-msg-author">{author}</div>}

      {/* Bubble + emoji picker */}
      <div style={{ position: "relative" }}>
        <div className="rc-msg-bubble">
          {text}
          {id && isOpen && (
            <div className={`rc-emoji-picker rc-emoji-picker-${type}`}>
              {EMOJIS.map((em) => (
                <span
                  key={em}
                  className="rc-emoji-opt"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact(id, em);
                    setOpenPickerId(null);
                  }}
                >
                  {em}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reactions + actions */}
      {id && (
        <>
          <div className="rc-reactions">
            {Object.entries(reactions)
              .filter(([, users]) => users.length > 0)
              .map(([emoji, users]) => (
                <span
                  key={emoji}
                  className={`rc-reaction-pill ${
                    users.includes(currentUser) ? "rc-reaction-pill-mine" : ""
                  }`}
                  onClick={() => onReact(id, emoji)}
                >
                  {emoji} {users.length}
                </span>
              ))}
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              className="rc-react-btn"
              onClick={(e) => {
                e.stopPropagation();
                setOpenPickerId(isOpen ? null : id);
              }}
            >
              + react
            </button>
            {author === currentUser && (
              <button className="rc-delete-btn" onClick={() => onDelete(id)}>
                ✕ delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
