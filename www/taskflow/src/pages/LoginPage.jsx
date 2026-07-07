import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Icon from "../components/ui/Icon";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated, signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const switchMode = (signup) => {
    setIsSignup(signup);
    setError("");
    setInfo("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);

    if (isSignup) {
      const { error: signUpError, needsEmailConfirmation } = await signUpWithPassword(email, password, fullName);
      setSubmitting(false);
      if (signUpError) return setError(signUpError.message);
      if (needsEmailConfirmation) return setInfo("Check your email to confirm your account, then log in.");
      navigate("/dashboard");
      return;
    }

    const { error: signInError } = await signInWithPassword(email, password);
    setSubmitting(false);
    if (signInError) return setError(signInError.message);
    navigate("/dashboard");
  };

  const handleGoogle = async () => {
    setError("");
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) setError(oauthError.message);
  };

  const authTitle = isSignup ? "Create your account" : "Welcome back";
  const authSub = isSignup
    ? "Start organizing your team’s work in minutes."
    : "Log in to your SRT TaskFlow workspace.";
  const authCta = isSignup ? "Create account" : "Log in";

  return (
    <div
      className="grid min-h-screen"
      style={{ gridTemplateColumns: "1.05fr 0.95fr" }}
    >
      <div
        className="relative flex flex-col justify-between overflow-hidden text-white"
        style={{
          padding: "56px 60px",
          background:
            "linear-gradient(155deg,#0c55a3 0%,#0a3f79 52%,#071f3a 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="relative flex-none rounded-lg bg-white"
            style={{ width: 34, height: 34 }}
          >
            <div
              className="absolute rounded-sm"
              style={{
                left: 7,
                top: 7,
                width: 6,
                height: 20,
                background: "var(--primary)",
              }}
            />
            <div
              className="absolute rounded-sm"
              style={{
                left: 15,
                top: 7,
                width: 6,
                height: 13,
                background: "var(--danger)",
              }}
            />
            <div
              className="absolute rounded-sm"
              style={{
                left: 23,
                top: 7,
                width: 6,
                height: 16,
                background: "#7cb2e8",
              }}
            />
          </div>
          <span className="text-xl font-extrabold tracking-tight">
            SRT TaskFlow
          </span>
        </div>

        <div style={{ maxWidth: 440 }}>
          <h1
            className="font-extrabold tracking-tight"
            style={{ fontSize: 42, lineHeight: 1.08, margin: "0 0 18px" }}
          >
            Where teams move work forward, together.
          </h1>
          <p
            className="text-base"
            style={{
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.8)",
              margin: 0,
            }}
          >
            Boards, lists and cards that stay in sync in real time. Plan
            sprints, assign work, and ship faster.
          </p>
          <div className="flex" style={{ gap: 22, marginTop: 34 }}>
            <div>
              <div className="text-2xl font-extrabold">12k+</div>
              <div
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                teams
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold">99.9%</div>
              <div
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                uptime
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold">Realtime</div>
              <div
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                sync
              </div>
            </div>
          </div>
        </div>

        <div className="flex" style={{ gap: 12, opacity: 0.9 }}>
          <div
            className="rounded-xl"
            style={{
              width: 150,
              background: "rgba(255,255,255,0.09)",
              border: "1px solid rgba(255,255,255,0.14)",
              padding: 12,
            }}
          >
            <div
              className="text-xs font-bold"
              style={{ color: "rgba(255,255,255,0.7)", marginBottom: 9 }}
            >
              TO DO
            </div>
            <div
              className="rounded"
              style={{
                background: "rgba(255,255,255,0.16)",
                height: 34,
                marginBottom: 7,
              }}
            />
            <div
              className="rounded"
              style={{ background: "rgba(255,255,255,0.12)", height: 28 }}
            />
          </div>
          <div
            className="rounded-xl"
            style={{
              width: 150,
              background: "rgba(255,255,255,0.09)",
              border: "1px solid rgba(255,255,255,0.14)",
              padding: 12,
            }}
          >
            <div
              className="text-xs font-bold"
              style={{ color: "rgba(255,255,255,0.7)", marginBottom: 9 }}
            >
              IN PROGRESS
            </div>
            <div
              className="rounded"
              style={{
                background: "rgba(255,255,255,0.2)",
                height: 44,
                marginBottom: 7,
              }}
            />
            <div
              className="rounded"
              style={{ background: "rgba(255,255,255,0.12)", height: 24 }}
            />
          </div>
        </div>
      </div>

      <div
        className="relative flex items-center justify-center"
        style={{ padding: 40, background: "var(--surface)" }}
      >
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-2)]"
          style={{
            top: 24,
            right: 24,
            width: 40,
            height: 40,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-2)",
          }}
        >
          <Icon name={theme === "light" ? "dark_mode" : "light_mode"} />
        </button>

        <div className="w-full" style={{ maxWidth: 380 }}>
          <h2
            className="font-extrabold tracking-tight"
            style={{ fontSize: 26, margin: "0 0 6px" }}
          >
            {authTitle}
          </h2>
          <p
            className="text-sm"
            style={{ color: "var(--text-2)", margin: "0 0 26px" }}
          >
            {authSub}
          </p>

          <div
            className="flex rounded-xl"
            style={{
              gap: 6,
              background: "var(--surface-2)",
              padding: 4,
              marginBottom: 22,
            }}
          >
            <button
              type="button"
              onClick={() => switchMode(false)}
              className="flex-1 rounded-lg text-sm font-bold cursor-pointer"
              style={{
                height: 36,
                border: "none",
                ...(!isSignup
                  ? {
                      background: "var(--surface)",
                      color: "var(--text)",
                      boxShadow: "var(--shadow)",
                    }
                  : { background: "none", color: "var(--text-2)" }),
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => switchMode(true)}
              className="flex-1 rounded-lg text-sm font-bold cursor-pointer"
              style={{
                height: 36,
                border: "none",
                ...(isSignup
                  ? {
                      background: "var(--surface)",
                      color: "var(--text)",
                      boxShadow: "var(--shadow)",
                    }
                  : { background: "none", color: "var(--text-2)" }),
              }}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <div style={{ marginBottom: 16 }}>
                <label
                  className="block text-sm font-semibold"
                  style={{ marginBottom: 7 }}
                >
                  Full name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Ada Lovelace"
                  className="w-full rounded-lg text-sm outline-none focus:border-[var(--primary)]"
                  style={{
                    height: 46,
                    padding: "0 14px",
                    border: "1px solid var(--border-2)",
                    background: "var(--surface)",
                    color: "var(--text)",
                  }}
                />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label
                className="block text-sm font-semibold"
                style={{ marginBottom: 7 }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full rounded-lg text-sm outline-none focus:border-[var(--primary)]"
                style={{
                  height: 46,
                  padding: "0 14px",
                  border: "1px solid var(--border-2)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label
                className="block text-sm font-semibold"
                style={{ marginBottom: 7 }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full rounded-lg text-sm outline-none focus:border-[var(--primary)]"
                style={{
                  height: 46,
                  padding: "0 14px",
                  border: "1px solid var(--border-2)",
                  background: "var(--surface)",
                  color: "var(--text)",
                }}
              />
            </div>

            {error && (
              <div
                className="text-sm"
                style={{
                  marginBottom: 16,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--danger-soft)",
                  color: "var(--danger-2)",
                }}
              >
                {error}
              </div>
            )}
            {info && (
              <div
                className="text-sm"
                style={{
                  marginBottom: 16,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                }}
              >
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg text-white font-bold cursor-pointer hover:bg-[var(--primary-2)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                height: 47,
                border: "none",
                background: "var(--primary)",
                fontSize: 15,
                boxShadow: "0 2px 8px rgba(12,85,163,0.28)",
              }}
            >
              {submitting ? "Please wait…" : authCta}
            </button>
          </form>

          <div
            className="flex items-center"
            style={{ gap: 12, margin: "20px 0" }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              or
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="flex w-full items-center justify-center rounded-lg text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)]"
            style={{
              height: 47,
              gap: 10,
              border: "1px solid var(--border-2)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--danger)",
              }}
            >
              G
            </span>
            Continue with Google
          </button>

          <p
            className="text-center text-sm"
            style={{ color: "var(--text-3)", margin: "22px 0 0" }}
          >
            Protected by workspace-level RBAC &amp; row-level security.
          </p>
        </div>
      </div>
    </div>
  );
}
