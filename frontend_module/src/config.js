export const SERVER =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SERVER) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_SERVER) ||
  "http://localhost:5000";

export const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];
