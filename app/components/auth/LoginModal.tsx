"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { LogoMark } from "../layout/Header";

export function LoginModal({
  onClose,
  onLogin,
  onRegister,
}: {
  onClose: () => void;
  onLogin: (nickname: string, password: string) => Promise<void>;
  onRegister: (nickname: string, password: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") await onRegister(nickname, password);
      else await onLogin(nickname, password);
    } catch (nextError) {
      setError(t((nextError as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="login-modal" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose}>
          ×
        </button>
        <LogoMark />
        <span className="modal-kicker">{t("YOUR PROFILE")}</span>
        <h2>{t(mode === "register" ? "Create your profile" : "Sign in to continue")}</h2>
        <label className="field">
          <span>{t("Nickname")}</span>
          <input
            autoFocus
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            autoComplete="username"
            minLength={2}
            maxLength={40}
            required
          />
        </label>
        <label className="field">
          <span>{t("Password")}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            minLength={6}
            maxLength={128}
            required
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="button primary" disabled={busy}>
          {busy ? "…" : t(mode === "register" ? "Create account" : "Sign in")}
          <span>↗</span>
        </button>
        <button
          className="auth-mode-switch"
          type="button"
          onClick={() => {
            setMode((current) => current === "login" ? "register" : "login");
            setError("");
          }}
        >
          {t(mode === "register" ? "Already have an account? Sign in" : "New here? Create account")}
        </button>
      </form>
    </div>
  );
}
