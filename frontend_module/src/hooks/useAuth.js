import { useState } from "react";
import { SERVER } from "../config";

/**
 * Handles login / register and persists the token in localStorage.
 */
export function useAuth() {
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem("rc_user") || ""
  );
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("rc_token") || ""
  );

  async function login(username, password) {
    return _submit("login", username, password);
  }

  async function register(username, password) {
    return _submit("register", username, password);
  }

  async function _submit(mode, username, password) {
    const endpoint = mode === "login" ? "/login" : "/register";
    const res  = await fetch(SERVER + endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Auth failed");

    setAuthToken(data.token);
    setCurrentUser(data.username);
    localStorage.setItem("rc_token", data.token);
    localStorage.setItem("rc_user", data.username);
    return data;
  }

  function logout() {
    setAuthToken("");
    setCurrentUser("");
    localStorage.removeItem("rc_token");
    localStorage.removeItem("rc_user");
  }

  const isAuthenticated = Boolean(authToken && currentUser);

  return { currentUser, authToken, isAuthenticated, login, register, logout };
}
