"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import type { User } from "../../../lib/types";
import { useI18n } from "../../i18n/I18nContext";
import type { Language } from "../../i18n/I18nContext";
import { api } from "../../lib/api";
import type { View } from "../../types";
import { RemoteImage } from "../shared/RemoteImage";

export function Header({
  view,
  user,
  language,
  languageOpen,
  profileOpen,
  onHome,
  onNavigate,
  onLanguageOpen,
  onLanguage,
  onProfile,
  onLogout,
  onAvatar,
}: {
  view: View;
  user: User | null;
  language: Language;
  languageOpen: boolean;
  profileOpen: boolean;
  onHome: () => void;
  onNavigate: (view: Exclude<View, "home">) => void;
  onLanguageOpen: () => void;
  onLanguage: (language: Language) => void;
  onProfile: () => void;
  onLogout: () => void;
  onAvatar: (url: string) => void;
}) {
  const { t } = useI18n();
  return (
    <header className="topbar">
      <Logo onClick={onHome} />
      <nav className="main-nav" aria-label={t("Main navigation")}>
        <button
          className={view === "upload" ? "active" : ""}
          onClick={() => onNavigate("upload")}
        >
          <span>01</span>
          {t("Upload pack")}
        </button>
        <button
          className={view === "packs" ? "active" : ""}
          onClick={() => onNavigate("packs")}
        >
          <span>02</span>
          {t("Your packs")}
        </button>
        <button
          className={view === "modes" || view === "hill" || view === "wheel" ? "active" : ""}
          onClick={() => onNavigate("modes")}
        >
          <span>03</span>
          {t("Modes")}
        </button>
      </nav>
      <div className="top-actions">
        <div className="language-picker">
          <button
            className="icon-button"
            onClick={onLanguageOpen}
            aria-label={t("Choose language")}
          >
            {languageLabel(language)}⌄
          </button>
          {languageOpen && (
            <div className="language-menu">
              <button
                className={language === "en" ? "active" : ""}
                onClick={() => onLanguage("en")}
              >
                English
              </button>
              <button
                className={language === "ru" ? "active" : ""}
                onClick={() => onLanguage("ru")}
              >
                рузкий
              </button>
              <button
                className={language === "uk" ? "active" : ""}
                onClick={() => onLanguage("uk")}
              >
                УкрАинский
              </button>
            </div>
          )}
        </div>
        <div className="profile-menu-wrap">
          <button className="profile-chip" onClick={onProfile}>
            <UserAvatar user={user} />
            <span className="profile-label">
              {user?.nickname ?? t("Sign in")}
            </span>
          </button>
          {user && profileOpen && (
            <ProfileMenu user={user} onLogout={onLogout} onAvatar={onAvatar} />
          )}
        </div>
      </div>
    </header>
  );
}

function Logo({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button className="brand" onClick={onClick} aria-label={t("MRanking home")}>
      <LogoMark />
      <span className="brand-name">
        M
        <br />
        <strong>Ranking</strong>
      </span>
    </button>
  );
}

export function LogoMark() {
  return (
    <span className="brand-mark">
      <i>MR</i>
      <b>♛</b>
    </span>
  );
}

function UserAvatar({ user }: { user: User | null }) {
  return (
    <span className="avatar">
      {user?.avatarUrl ? (
        <RemoteImage src={user.avatarUrl} alt="" />
      ) : (
        (user?.avatarEmoji ?? "?")
      )}
    </span>
  );
}

function ProfileMenu({
  user,
  onLogout,
  onAvatar,
}: {
  user: User;
  onLogout: () => void;
  onAvatar: (url: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t("Avatar must be smaller than 2 MB"));
      event.target.value = "";
      return;
    }
    setBusy(true);
    setAvatarError("");
    try {
      const form = new FormData();
      form.append("avatar", file);
      const data = await api<{ avatarUrl: string }>("/api/avatar", {
        method: "POST",
        body: form,
      });
      onAvatar(data.avatarUrl);
    } catch (error) {
      setAvatarError(t((error as Error).message));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }
  return (
    <div className="profile-menu">
      <div className="profile-menu-head">
        <UserAvatar user={user} />
        <div>
          <b>{user.nickname}</b>
          <span>{t("Profile")}</span>
        </div>
      </div>
      <label className="menu-action upload-action">
        {busy ? "…" : t("Upload avatar")}
        <input type="file" accept="image/*" onChange={upload} />
      </label>
      {avatarError && <span className="profile-menu-error">{avatarError}</span>}
      <button className="menu-action danger" onClick={onLogout}>
        {t("Sign out")}
      </button>
    </div>
  );
}

function languageLabel(language: Language): string {
  switch (language) {
    case "en":
      return "EN";
    case "ru":
      return "РУ";
    case "uk":
      return "УК";
  }
}
