import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { SERVER } from "../config";

/**
 * Manages the Socket.IO connection and message state for a single room session.
 */
export function useChat({ roomId, currentUser, authToken }) {
  const [messages, setMessages]   = useState([]);
  const [hasMore, setHasMore]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const socketRef      = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const headers = useCallback(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }),
    [authToken]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ── Load a page of history ──────────────────────────────────────────────
  const loadMessages = useCallback(
    async (page) => {
      try {
        const res  = await fetch(
          `${SERVER}/messages/${roomId}?page=${page}&limit=50`,
          { headers: headers() }
        );
        const data = await res.json();

        setHasMore(data.has_more);
        setCurrentPage(page);

        const shaped = data.messages.map((m) => ({
          id:        m._id,
          author:    m.user,
          text:      m.message,
          type:      m.user === currentUser ? "self" : "other",
          reactions: m.reactions || {},
        }));

        if (page === 1) {
          const footer =
            data.messages.length > 0
              ? [{
                  id:     null,
                  author: null,
                  text:   `── ${data.total} message${data.total !== 1 ? "s" : ""} in this room ──`,
                  type:   "system",
                }]
              : [];
          setMessages([...shaped, ...footer]);
          setTimeout(scrollToBottom, 50);
        } else {
          // Prepend older messages
          setMessages((prev) => [...shaped, ...prev]);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    },
    [roomId, currentUser, headers, scrollToBottom]
  );

  // ── Socket lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    loadMessages(1);

    const socket = io(SERVER, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { room_id: roomId, user_id: currentUser });
    });

    socket.on("message", (data) => {
      if (typeof data === "string") {
        setMessages((prev) => [
          ...prev,
          { id: null, author: null, text: data, type: "system" },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id:        data.message_id,
            author:    data.user,
            text:      data.message,
            type:      data.user === currentUser ? "self" : "other",
            reactions: data.reactions || {},
          },
        ]);
      }
      setTimeout(scrollToBottom, 30);
    });

    socket.on("message_deleted", ({ message_id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== message_id));
    });

    socket.on("reaction_updated", ({ message_id, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === message_id ? { ...m, reactions } : m))
      );
    });

    socket.on("user_typing", ({ user }) => {
      setTypingUsers((prev) => new Set([...prev, user]));
    });

    socket.on("user_stop_typing", ({ user }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(user);
        return next;
      });
    });

    socket.on("disconnect", () => {
      setMessages((prev) => [
        ...prev,
        { id: null, author: null, text: "Disconnected from server", type: "system" },
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, currentUser, loadMessages, scrollToBottom]);

  // ── Actions ─────────────────────────────────────────────────────────────
  function sendMessage(text) {
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit("send_message", {
      room_id:  roomId,
      user_id:  currentUser,
      message:  text.trim(),
    });
    socketRef.current.emit("stop_typing", { room_id: roomId, user_id: currentUser });
    clearTimeout(typingTimerRef.current);
  }

  function emitTyping() {
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { room_id: roomId, user_id: currentUser });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", { room_id: roomId, user_id: currentUser });
    }, 2000);
  }

  function leaveRoom() {
    socketRef.current?.emit("leave_room", { room_id: roomId, user_id: currentUser });
    socketRef.current?.disconnect();
  }

  async function sendReaction(msgId, emoji, showToast) {
    try {
      await fetch(`${SERVER}/messages/${msgId}/react`, {
        method:  "POST",
        headers: headers(),
        body:    JSON.stringify({ emoji }),
      });
    } catch {
      showToast?.("Reaction failed", true);
    }
  }

  async function deleteMessage(msgId, showToast) {
    try {
      const res = await fetch(`${SERVER}/messages/${msgId}`, {
        method:  "DELETE",
        headers: headers(),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast?.(d.message, true);
      }
    } catch {
      showToast?.("Delete failed", true);
    }
  }

  return {
    messages,
    hasMore,
    currentPage,
    typingUsers,
    messagesEndRef,
    loadMessages,
    sendMessage,
    emitTyping,
    leaveRoom,
    sendReaction,
    deleteMessage,
  };
}
