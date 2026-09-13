"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
export function Signin() {
  const params = useSearchParams();
  const [email, setEmail] = useState(""),
    [challenge, setChallenge] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (!countdown) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);
  async function request() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!json.ok) {
        setCountdown(json.error.retryAfter ?? 0);
        throw new Error(json.error.message);
      }
      setChallenge(json.data.challengeId);
      setCountdown(60);
      setCode("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Email delivery is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge,
          code,
          returnTo: params.get("returnTo") ?? "/app",
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error.message);
      window.location.assign(json.data.returnTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify code.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card">
      <span className="eyebrow">YOUR RESEARCH STARTS HERE</span>
      <h1>{challenge ? "Check your inbox." : "Welcome to Lens Atlas."}</h1>
      <p>
        {challenge
          ? "Enter the six-digit code sent to " + email
          : "Sign up or sign in with your email. No password to remember."}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void (challenge ? verify() : request());
        }}
      >
        {challenge ? (
          <>
            <label htmlFor="code">Verification code</label>
            <input
              id="code"
              name="code"
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              required
            />
          </>
        ) : (
          <>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </>
        )}
        <button className="primary full" disabled={busy}>
          {busy
            ? "Please wait…"
            : challenge
              ? "Verify and continue →"
              : "Send verification code →"}
        </button>
      </form>
      {challenge && (
        <div className="auth-actions">
          <button
            disabled={busy || countdown > 0}
            onClick={() => void request()}
          >
            {countdown ? "Resend in " + countdown + "s" : "Resend code"}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setChallenge("");
              setCode("");
              setError("");
            }}
          >
            Change email
          </button>
        </div>
      )}
      <p role="alert" className="error">
        {error}
      </p>
      <p className="fine">
        Your sign-in lasts seven days. Codes expire after ten minutes. Lens
        Atlas registration does not create a Fomolens account or credit
        allowance.
      </p>
    </section>
  );
}
