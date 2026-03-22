import { useState, useEffect, useRef } from "react";
import { SERVER } from "../config";

/**
 * WakeUpScreen — shown when the Render backend is cold-starting.
 * Automatically pings SERVER/ every 3s until it responds, then calls onReady().
 * Drop this into App.jsx and wrap the auth flow with it.
 */

const MESSAGES = [
  "Warming up the server…",
  "Brewing some coffee ☕",
  "Dusting off the database…",
  "Almost there, hang tight…",
  "Waking up the hamsters 🐹",
  "Loading the good stuff…",
  "Just a few more seconds…",
  "Your patience is appreciated ✨",
];

const CSS = `
  @keyframes rc-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes rc-pulse-ring {
    0%   { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes rc-fadeSlideUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rc-bar {
    0%   { width: 0%; }
    100% { width: 100%; }
  }
  @keyframes rc-dot-bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40%           { transform: translateY(-8px); }
  }

  .wakeup-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: #0a0a0f;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0;
    font-family: 'Syne', sans-serif;
  }

  /* Noise texture */
  .wakeup-overlay::before {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  }

  /* Ambient glow */
  .wakeup-glow {
    position: absolute;
    width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,77,109,0.07) 0%, transparent 70%);
    pointer-events: none;
    animation: rc-pulse-ring 3s ease-out infinite;
  }

  .wakeup-inner {
    position: relative;
    display: flex; flex-direction: column;
    align-items: center; gap: 32px;
    animation: rc-fadeSlideUp 0.4s ease both;
  }

  /* Logo */
  .wakeup-logo {
    font-size: 42px; font-weight: 800;
    letter-spacing: -2px; line-height: 1;
    color: #e8e8f0;
  }
  .wakeup-logo span { color: #ff4d6d; }

  /* Spinner ring */
  .wakeup-ring-wrap {
    position: relative;
    width: 80px; height: 80px;
    display: flex; align-items: center; justify-content: center;
  }
  .wakeup-ring {
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 2px solid #2a2a3d;
    border-top-color: #ff4d6d;
    border-right-color: #4dffc3;
    animation: rc-spin 1.2s linear infinite;
  }
  .wakeup-ring-inner {
    position: absolute;
    inset: 10px;
    border-radius: 50%;
    border: 1.5px solid #1a1a26;
    border-bottom-color: #ff4d6d44;
    animation: rc-spin 2s linear infinite reverse;
  }
  .wakeup-ring-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #4dffc3;
    box-shadow: 0 0 12px #4dffc3;
  }

  /* Status text */
  .wakeup-status {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    color: #6b6b88;
    letter-spacing: 1px;
    text-align: center;
    min-height: 20px;
    transition: opacity 0.3s;
  }
  .wakeup-status.changing { opacity: 0; }

  /* Progress bar */
  .wakeup-progress-wrap {
    width: 240px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .wakeup-progress-track {
    width: 100%; height: 3px;
    background: #1a1a26;
    border-radius: 100px;
    overflow: hidden;
  }
  .wakeup-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #ff4d6d, #4dffc3);
    border-radius: 100px;
    transition: width 0.6s ease;
  }
  .wakeup-progress-label {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #6b6b88;
    display: flex;
    justify-content: space-between;
  }

  /* Dots */
  .wakeup-dots {
    display: flex; gap: 6px; align-items: center;
  }
  .wakeup-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #2a2a3d;
  }
  .wakeup-dot.active {
    background: #4dffc3;
    box-shadow: 0 0 8px #4dffc3;
    animation: rc-dot-bounce 0.6s ease both;
  }

  /* Tip card */
  .wakeup-tip {
    margin-top: 8px;
    background: #12121a;
    border: 1.5px solid #2a2a3d;
    border-radius: 12px;
    padding: 12px 20px;
    max-width: 280px;
    text-align: center;
  }
  .wakeup-tip-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #ff4d6d;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .wakeup-tip-text {
    font-size: 13px;
    color: #6b6b88;
    line-height: 1.5;
  }

  /* Success state */
  .wakeup-success .wakeup-ring {
    border-color: #4dffc3;
    border-top-color: #4dffc3;
    border-right-color: #4dffc3;
    animation: none;
  }
  .wakeup-success .wakeup-status {
    color: #4dffc3;
  }
`;

const TIPS = [
  "💡 Create a room and share the 6-digit code with friends to start chatting.",
  "🔒 You can password-protect rooms for private conversations.",
  "😄 React to messages with emojis by clicking '+ react'.",
  "🗑️ You can delete your own messages anytime.",
  "👑 The room creator is marked with a crown in the members list.",
];

const MAX_WAIT_SECONDS = 60;

export function WakeUpScreen({ onReady }) {
  const [elapsed, setElapsed]       = useState(0);
  const [msgIndex, setMsgIndex]     = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  const [tipIndex]                  = useState(() => Math.floor(Math.random() * TIPS.length));
  const [success, setSuccess]       = useState(false);
  const intervalRef                 = useRef(null);
  const pingRef                     = useRef(null);
  const elapsedRef                  = useRef(0);

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById("wakeup-css")) return;
    const el = document.createElement("style");
    el.id = "wakeup-css";
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  // Rotate status messages every 4s
  useEffect(() => {
    const t = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        setMsgVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Tick elapsed time every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Ping backend every 3s until it responds
  useEffect(() => {
    async function ping() {
      try {
        const res = await fetch(`${SERVER}/`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          // Backend is awake!
          setSuccess(true);
          clearInterval(pingRef.current);
          clearInterval(intervalRef.current);
          setTimeout(onReady, 900); // brief success flash then proceed
        }
      } catch {
        // Still sleeping — try again next interval
      }
    }

    ping(); // immediate first ping
    pingRef.current = setInterval(ping, 3000);
    return () => clearInterval(pingRef.current);
  }, [onReady]);

  const progress = Math.min((elapsed / MAX_WAIT_SECONDS) * 100, 95);
  const activeDot = elapsed % 3;

  return (
    <div className={`wakeup-overlay ${success ? "wakeup-success" : ""}`}>
      <div className="wakeup-glow" />

      <div className="wakeup-inner">
        {/* Logo */}
        <div className="wakeup-logo">Room<span>Chat</span></div>

        {/* Spinner */}
        <div className="wakeup-ring-wrap">
          <div className="wakeup-ring" />
          <div className="wakeup-ring-inner" />
          <div className="wakeup-ring-dot" />
        </div>

        {/* Status message */}
        <div className={`wakeup-status ${!msgVisible ? "changing" : ""}`}>
          {success ? "✓ Connected! Loading…" : MESSAGES[msgIndex]}
        </div>

        {/* Progress */}
        <div className="wakeup-progress-wrap">
          <div className="wakeup-progress-track">
            <div
              className="wakeup-progress-bar"
              style={{ width: success ? "100%" : `${progress}%` }}
            />
          </div>
          <div className="wakeup-progress-label">
            <span>Starting server</span>
            <span>{elapsed}s</span>
          </div>
        </div>

        {/* Animated dots */}
        <div className="wakeup-dots">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`wakeup-dot ${activeDot === i ? "active" : ""}`}
            />
          ))}
        </div>

        {/* Tip card */}
        <div className="wakeup-tip">
          <div className="wakeup-tip-label">💬 Did you know?</div>
          <div className="wakeup-tip-text">{TIPS[tipIndex]}</div>
        </div>
      </div>
    </div>
  );
}