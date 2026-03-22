import { useState, useEffect } from "react";
import { useAuth }            from "./hooks/useAuth";
import { useToast }           from "./hooks/useToast";
import { Toast }              from "./components/UI";
import { LandingScreen }      from "./screens/LandingScreen";
import { AuthScreen }         from "./screens/AuthScreen";
import { DashboardScreen }    from "./screens/DashboardScreen";
import { RoomCreatedScreen }  from "./screens/RoomCreatedScreen";
import { ChatScreen }         from "./screens/ChatScreen";
import "./styles/global.css";

export default function App() {
  const { currentUser, authToken, isAuthenticated, login, register, logout } = useAuth();
  const { toast, showToast } = useToast();

  // "landing" | "auth" | "dashboard" | "created" | "chat"
  const [screen, setScreen]     = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [room, setRoom]         = useState({ id: "", name: "" });

  // Restore session
  useEffect(() => {
    if (isAuthenticated) setScreen("dashboard");
  }, []);

  // ── Auth callback ──────────────────────────────────────────────────────
  async function handleAuthSuccess(mode, username, password) {
    const fn = mode === "login" ? login : register;
    await fn(username, password); // throws on failure → AuthScreen catches it
    setScreen("dashboard");
  }

  // ── Room navigation ────────────────────────────────────────────────────
  function enterRoom(id, name, isNewlyCreated = false) {
    setRoom({ id, name });
    setScreen(isNewlyCreated ? "created" : "chat");
  }

  function handleLogout() {
    logout();
    setScreen("landing");
  }

  return (
    <>
      {screen === "landing" && (
        <LandingScreen
          onLogin={() => { setAuthMode("login"); setScreen("auth"); }}
          onRegister={() => { setAuthMode("register"); setScreen("auth"); }}
        />
      )}

      {screen === "auth" && (
        <AuthScreen
          mode={authMode}
          onSuccess={handleAuthSuccess}
          onBack={() => setScreen("landing")}
        />
      )}

      {screen === "dashboard" && (
        <DashboardScreen
          currentUser={currentUser}
          authToken={authToken}
          onEnterRoom={enterRoom}
          onLogout={handleLogout}
          showToast={showToast}
        />
      )}

      {screen === "created" && (
        <RoomCreatedScreen
          roomId={room.id}
          onEnter={() => setScreen("chat")}
          onBack={() => setScreen("dashboard")}
        />
      )}

      {screen === "chat" && (
        <ChatScreen
          currentUser={currentUser}
          authToken={authToken}
          roomId={room.id}
          roomName={room.name}
          onLeave={() => setScreen("dashboard")}
          showToast={showToast}
        />
      )}

      <Toast message={toast.message} isError={toast.isError} />
    </>
  );
}
