import { useState, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { MessageItem } from "../components/MessageItem";
import { MembersPanel } from "../components/MembersPanel";
import { SERVER } from "../config";

export function ChatScreen({ currentUser, authToken, roomId, roomName, onLeave, showToast }) {
  const [msgInput, setMsgInput]             = useState("");
  const [openPickerId, setOpenPickerId]     = useState(null);
  const [membersVisible, setMembersVisible] = useState(false);
  const [membersData, setMembersData]       = useState(null);

  const {
    messages,
    hasMore,
    currentPage,
    typingUsers,
    scrollRef,
    loadMessages,
    sendMessage,
    emitTyping,
    leaveRoom,
    sendReaction,
    deleteMessage,
  } = useChat({ roomId, currentUser, authToken });

  useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest(".rc-emoji-picker") && !e.target.closest(".rc-react-btn")) {
        setOpenPickerId(null);
      }
      if (
        membersVisible &&
        !e.target.closest(".rc-members-panel") &&
        !e.target.closest(".rc-icon-btn")
      ) {
        setMembersVisible(false);
        setMembersData(null);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [membersVisible]);

  async function toggleMembers() {
    if (membersVisible) {
      setMembersVisible(false);
      setMembersData(null);
      return;
    }
    try {
      const res  = await fetch(`${SERVER}/room/${roomId}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      setMembersData(data);
      setMembersVisible(true);
    } catch {
      showToast("Could not load members", true);
    }
  }

  function handleSend() {
    sendMessage(msgInput);
    setMsgInput("");
  }

  function handleInputChange(e) {
    setMsgInput(e.target.value);
    emitTyping();
  }

  function handleLeave() {
    leaveRoom();
    onLeave();
  }

  const typingArr  = [...typingUsers];
  const typingText =
    typingArr.length === 0 ? ""
    : typingArr.length === 1 ? `${typingArr[0]} is typing…`
    : `${typingArr.slice(0, 2).join(", ")} are typing…`;

  return (
    <div className="rc-screen rc-chat-screen">
      <div className="rc-chat-header">
        <div className="rc-room-badge">
          <div className="rc-room-dot" />
          <div>
            <div className="rc-room-name-val">{roomName}</div>
            <div className="rc-room-id-small">{roomId}</div>
          </div>
        </div>
        <div className="rc-header-right">
          <button className="rc-icon-btn" onClick={toggleMembers} title="Members">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </button>
          <div className="rc-user-chip">{currentUser}</div>
          <button className="rc-back-link" onClick={handleLeave}>Leave</button>
        </div>
      </div>

      {membersVisible && membersData && (
        <MembersPanel members={membersData} currentUser={currentUser} />
      )}

      <div className="rc-messages" ref={scrollRef}>
        {hasMore && (
          <button
            className="rc-load-more-btn"
            onClick={() => loadMessages(currentPage + 1)}
          >
            ↑ Load older messages
          </button>
        )}
        {messages.map((msg, i) => (
          <MessageItem
            key={msg.id || `sys-${i}`}
            msg={msg}
            currentUser={currentUser}
            onReact={(id, emoji) => sendReaction(id, emoji, showToast)}
            onDelete={(id) => deleteMessage(id, showToast)}
            openPickerId={openPickerId}
            setOpenPickerId={setOpenPickerId}
          />
        ))}
      </div>

      <div className="rc-typing-bar">{typingText}</div>

      <div className="rc-input-bar">
        <input
          className="rc-msg-input"
          type="text"
          placeholder="Type a message…"
          autoComplete="off"
          value={msgInput}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          autoFocus
        />
        <button className="rc-send-btn" onClick={handleSend}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}