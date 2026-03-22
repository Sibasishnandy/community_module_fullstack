export function LandingScreen({ onLogin, onRegister }) {
  return (
    <div className="rc-screen" style={{ flexDirection: "column", gap: 40, textAlign: "center" }}>
      <div>
        <div className="rc-logo">
          Room<span>Chat</span>
        </div>
        <div className="rc-tagline">Real-time group messaging</div>
      </div>
      <div className="rc-landing-btns">
        <button className="rc-btn rc-btn-primary" onClick={onLogin}>
          Sign In
        </button>
        <button className="rc-btn rc-btn-secondary" onClick={onRegister}>
          Create Account
        </button>
      </div>
    </div>
  );
}
