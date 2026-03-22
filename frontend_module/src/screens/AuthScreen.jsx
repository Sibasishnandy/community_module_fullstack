import { useState } from "react";
import { Field } from "../components/UI";

export function AuthScreen({ mode: initialMode, onSuccess, onBack }) {
  const [mode, setMode]         = useState(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");

  const isLogin = mode === "login";

  async function submit() {
    if (!username.trim() || !password) {
      setError("Fill in all fields.");
      return;
    }
    try {
      await onSuccess(mode, username.trim(), password);
    } catch (err) {
      setError(err.message || "Server unreachable.");
    }
  }

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  return (
    <div className="rc-screen" style={{ flexDirection: "column", gap: 16 }}>
      <div className="rc-form-card">
        <h3>{isLogin ? "Sign In" : "Create Account"}</h3>

        <Field
          label="Username"
          type="text"
          placeholder="your username"
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        {error && <span className="rc-error-text">{error}</span>}

        <div className="rc-btn-row">
          <button className="rc-btn rc-btn-primary" onClick={submit}>
            {isLogin ? "Sign In" : "Register"}
          </button>
        </div>

        <div className="rc-switch-text">
          {isLogin ? (
            <>
              No account?{" "}
              <span onClick={() => switchMode("register")}>Register</span>
            </>
          ) : (
            <>
              Have an account?{" "}
              <span onClick={() => switchMode("login")}>Sign In</span>
            </>
          )}
        </div>
      </div>

      <button className="rc-back-link" onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
