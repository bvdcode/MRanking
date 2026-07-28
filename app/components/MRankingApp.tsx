"use client";

import { useEffect, useMemo, useState } from "react";
import type { Pack, SavedResult, WheelResult } from "../../lib/types";
import { exportPack, packToEditable } from "../domain/pack";
import { I18nContext, translate } from "../i18n/I18nContext";
import { usePreferencesStore } from "../state/preferences";
import type { EditablePack, View } from "../types";
import { LoginModal } from "./auth/LoginModal";
import { HomeView } from "./home/HomeView";
import { usePrivateLibrary } from "./hooks/usePrivateLibrary";
import { useTournamentRun } from "./hooks/useTournamentRun";
import { useWheelRun } from "./hooks/useWheelRun";
import { Header, LogoMark } from "./layout/Header";
import { ModeView } from "./modes/ModeView";
import { PackLibraryView } from "./packs/PackLibraryView";
import { UploadView } from "./packs/UploadView";
import { TournamentFlow } from "./tournament/TournamentFlow";
import { WheelFlow } from "./wheel/WheelFlow";

export function MRankingApp() {
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const [view, setView] = useState<View>("home");
  const [viewedResult, setViewedResult] = useState<SavedResult | null>(null);
  const [viewedWheelResult, setViewedWheelResult] = useState<WheelResult | null>(null);
  const [editable, setEditable] = useState<EditablePack | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [toast, setToast] = useState("");

  const i18n = useMemo(
    () => ({
      language,
      t: (key: string, values?: Record<string, string | number>) =>
        translate(language, key, values),
    }),
    [language],
  );
  const { t } = i18n;
  const library = usePrivateLibrary(t, setToast);
  const tournament = useTournamentRun({
    user: library.user,
    packs: library.packs,
    results: library.results,
    savedRuns: library.savedRuns,
    setResults: library.setResults,
    setSavedRuns: library.setSavedRuns,
    onToast: setToast,
    t,
  });
  const wheel = useWheelRun({
    user: library.user,
    onToast: setToast,
    t,
  });
  const {
    activeRun,
    selectedPack: tournamentPack,
    setActiveRun,
    setModePack,
    startPack: startRun,
    chooseWinner,
    undo,
    reshuffle,
  } = tournament;
  const activeRunStatus = activeRun?.session.status;
  const {
    booting,
    user,
    packs,
    results,
    savedRuns,
    deletePack,
    cancelRun,
    updateAvatar,
  } = library;

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (activeRunStatus === "complete") {
      scrollToPageTop("auto");
    }
  }, [activeRunStatus]);

  function protectedNavigate(next: Exclude<View, "home">): void {
    setProfileOpen(false);
    setLanguageOpen(false);
    if (!user) {
      setLoginOpen(true);
      return;
    }
    setActiveRun(null);
    setModePack(null);
    if (next === "upload") {
      setEditable(null);
    }
    setViewedResult(null);
    setViewedWheelResult(null);
    wheel.leaveRun();
    setView(next);
    scrollToPageTop();
  }

  async function login(nickname: string, password: string): Promise<void> {
    await library.login(nickname, password);
    setLoginOpen(false);
  }

  async function register(nickname: string, password: string): Promise<void> {
    await library.register(nickname, password);
    setLoginOpen(false);
  }

  async function logout(): Promise<void> {
    await library.logout();
    setActiveRun(null);
    setViewedResult(null);
    setViewedWheelResult(null);
    wheel.clear();
    setEditable(null);
    setProfileOpen(false);
    setView("home");
  }

  async function savePack(draft: EditablePack): Promise<void> {
    await library.savePack(draft);
    setEditable(null);
    setViewedResult(null);
    setViewedWheelResult(null);
    setView("packs");
    scrollToPageTop();
  }

  async function deleteResult(result: SavedResult): Promise<void> {
    if (await library.deleteResult(result)) {
      setViewedResult((current) =>
        current?.id === result.id ? null : current,
      );
    }
  }

  function goHome(): void {
    setView("home");
    setActiveRun(null);
    setModePack(null);
    setEditable(null);
    setViewedResult(null);
    setViewedWheelResult(null);
    wheel.leaveRun();
    setLoginOpen(false);
    setProfileOpen(false);
    setLanguageOpen(false);
    setToast("");
    scrollToPageTop();
  }

  function startTournament(pack: Pack, resume = false): void {
    wheel.leaveRun();
    setViewedWheelResult(null);
    setViewedResult(null);
    startRun(pack, resume);
    setView("hill");
    scrollToPageTop();
  }

  function startWheel(pack: Pack, resume = false): void {
    setViewedResult(null);
    setViewedWheelResult(null);
    setActiveRun(null);
    setModePack(null);
    wheel.startPack(pack, resume);
    setView("wheel");
    scrollToPageTop();
  }

  if (booting) {
    return (
      <div className="boot-screen">
        <LogoMark />
        <span>{t("LOADING ARENA")}</span>
      </div>
    );
  }

  return (
    <I18nContext.Provider value={i18n}>
      <main className="app-shell">
        <div className="noise" aria-hidden="true" />
        <Header
          view={view}
          user={user}
          language={language}
          languageOpen={languageOpen}
          profileOpen={profileOpen}
          onHome={goHome}
          onNavigate={protectedNavigate}
          onLanguageOpen={() => {
            setProfileOpen(false);
            setLanguageOpen((open) => !open);
          }}
          onLanguage={(next) => {
            setLanguage(next);
            document.documentElement.lang = next;
            setLanguageOpen(false);
          }}
          onProfile={() => {
            setLanguageOpen(false);
            if (user) {
              setProfileOpen((open) => !open);
            } else {
              setLoginOpen(true);
            }
          }}
          onLogout={logout}
          onAvatar={updateAvatar}
        />

        {view === "home" && (
          <HomeView onStart={() => protectedNavigate("modes")} />
        )}
        {view === "upload" && user && (
          <UploadView
            key={editable?.id ?? "pack-uploader"}
            editable={editable}
            onEditable={setEditable}
            onSave={savePack}
            onBack={() => {
              setEditable(null);
              setView(editable ? "packs" : "home");
              scrollToPageTop();
            }}
          />
        )}
        {view === "packs" && user && (
          <PackLibraryView
            packs={packs}
            onAdd={() => {
              setEditable(null);
              setView("upload");
              scrollToPageTop();
            }}
            onPlay={(pack) => {
              setModePack(pack);
              setView("modes");
              scrollToPageTop();
            }}
            onEdit={(pack) => {
              setEditable(packToEditable(pack));
              setView("upload");
              scrollToPageTop();
            }}
            onDelete={deletePack}
            onExport={exportPack}
          />
        )}
        {view === "modes" && user && (
          <ModeView
            selectedPack={tournamentPack}
            onBack={() => {
              if (tournamentPack) {
                setModePack(null);
                setView("packs");
              } else {
                goHome();
              }
            }}
            onKing={() => {
              if (tournamentPack) {
                startTournament(tournamentPack);
                return;
              }
              setActiveRun(null);
              setModePack(null);
              setView("hill");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onOpenWheel={() => {
              if (tournamentPack) {
                startWheel(tournamentPack, Boolean(wheel.runs[tournamentPack.id]));
                return;
              }
              setActiveRun(null);
              setModePack(null);
              wheel.leaveRun();
              setViewedWheelResult(null);
              setView("wheel");
              scrollToPageTop();
            }}
          />
        )}
        {view === "hill" && user && (
          <TournamentFlow
            packs={packs}
            results={results}
            runs={savedRuns}
            activeRun={activeRun}
            selectedPack={tournamentPack}
            viewedResult={viewedResult}
            onBackModes={() => setView("modes")}
            onUpload={() => {
              setEditable(null);
              protectedNavigate("upload");
            }}
            onStart={startTournament}
            onClearResult={() => setViewedResult(null)}
            onOpenResult={setViewedResult}
            onDeleteResult={(result) => void deleteResult(result)}
            onCancelRun={(pack) => void cancelRun(pack)}
            onPick={chooseWinner}
            onUndo={undo}
            onReshuffle={reshuffle}
            onExitRun={() => setActiveRun(null)}
          />
        )}
        {view === "wheel" && user && (
          <WheelFlow
            packs={packs}
            runs={wheel.runs}
            results={wheel.results}
            settings={wheel.settings}
            activeRun={wheel.activeRun}
            selectedPack={wheel.selectedPack}
            viewedResult={viewedWheelResult}
            onViewedResult={(result) => {
              setViewedWheelResult(result);
              scrollToPageTop();
            }}
            onBackToModes={() => {
              setView("modes");
              scrollToPageTop();
            }}
            onUpload={() => {
              setEditable(null);
              protectedNavigate("upload");
            }}
            onStart={startWheel}
            onRunChange={wheel.setActiveRun}
            onSettings={wheel.setSettings}
            onLeave={() => {
              wheel.leaveRun();
              scrollToPageTop();
            }}
            onCancel={(pack) => void wheel.cancelRun(pack)}
            onDeleteResult={(result) => void wheel.deleteResult(result)}
          />
        )}
        <footer>
          <span>MRanking / {t("Tournament platform")}</span>
          <span>
            {t("UPLOAD")} → {t("COMPARE")} → {t("CROWN")}
          </span>
          <span>© 2026</span>
        </footer>
        {loginOpen && (
          <LoginModal
            onClose={() => setLoginOpen(false)}
            onLogin={login}
            onRegister={register}
          />
        )}
        {toast && (
          <div className="toast" role="status">
            <span>✓</span>
            {toast}
          </div>
        )}
      </main>
    </I18nContext.Provider>
  );
}

function scrollToPageTop(behavior: ScrollBehavior = "smooth"): void {
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior });
  });
}
