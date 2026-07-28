"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedResult } from "../../lib/types";
import { exportPack, packToEditable } from "../domain/pack";
import { I18nContext, translate } from "../i18n/I18nContext";
import { usePreferencesStore } from "../state/preferences";
import type { EditablePack, View } from "../types";
import { LoginModal } from "./auth/LoginModal";
import { HomeView } from "./home/HomeView";
import { usePrivateLibrary } from "./hooks/usePrivateLibrary";
import { useTournamentRun } from "./hooks/useTournamentRun";
import { Header, LogoMark } from "./layout/Header";
import { KingLibraryView } from "./modes/KingLibraryView";
import { ModeView } from "./modes/ModeView";
import { PackLibraryView } from "./packs/PackLibraryView";
import { UploadView } from "./packs/UploadView";
import { BattleView } from "./tournament/BattleView";
import { ResultView } from "./tournament/ResultView";

export function MRankingApp() {
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const [view, setView] = useState<View>("home");
  const [viewedResult, setViewedResult] = useState<SavedResult | null>(null);
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
    onStart: () => {
      setViewedResult(null);
      setView("hill");
    },
    onToast: setToast,
    t,
  });
  const {
    activeRun,
    selectedPack,
    setActiveRun,
    setModePack,
    startPack,
    chooseWinner,
    undo,
    skip,
  } = tournament;
  const {
    booting,
    user,
    packs,
    results,
    savedRuns,
    deletePack,
  } = library;

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function protectedNavigate(next: Exclude<View, "home">): void {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    setViewedResult(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    setEditable(null);
    setProfileOpen(false);
    setView("home");
  }

  async function savePack(draft: EditablePack): Promise<void> {
    await library.savePack(draft);
    setEditable(null);
    setViewedResult(null);
    setView("packs");
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
    setLoginOpen(false);
    setProfileOpen(false);
    setLanguageOpen(false);
    setToast("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const viewedResultPack = viewedResult
    ? (viewedResult.pack ??
      packs.find((pack) => pack.id === viewedResult.packId) ??
      null)
    : null;

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
          onLanguageOpen={() => setLanguageOpen((open) => !open)}
          onLanguage={(next) => {
            setLanguage(next);
            document.documentElement.lang = next;
            setLanguageOpen(false);
          }}
          onProfile={() =>
            user ? setProfileOpen((open) => !open) : setLoginOpen(true)
          }
          onLogout={logout}
          onAvatar={(next) =>
            library.setUser((current) =>
              current ? { ...current, avatarUrl: next } : current,
            )
          }
        />

        {view === "home" && (
          <HomeView onStart={() => protectedNavigate("modes")} />
        )}
        {view === "packs" && user && (
          <>
            <UploadView
              key={editable?.id ?? "pack-uploader"}
              editable={editable}
              onEditable={setEditable}
              onSave={savePack}
              onBack={goHome}
            />
            <PackLibraryView
              packs={packs}
              onEdit={(pack) => {
                setEditable(packToEditable(pack));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onDelete={deletePack}
              onExport={exportPack}
            />
          </>
        )}
        {view === "modes" && user && (
          <ModeView
            onBack={goHome}
            onKing={() => {
              setActiveRun(null);
              setModePack(null);
              setView("hill");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
        {view === "hill" &&
          user &&
          !activeRun &&
          viewedResult &&
          viewedResultPack && (
            <ResultView
              pack={viewedResultPack}
              run={{ session: viewedResult.session, undoStack: [] }}
              completedAt={viewedResult.completedAt}
              archived
              onAgain={
                packs.some((pack) => pack.id === viewedResult.packId)
                  ? () =>
                    startPack(
                      packs.find((pack) => pack.id === viewedResult.packId)!,
                    )
                  : undefined
              }
              onBack={() => setViewedResult(null)}
              onDelete={() => void deleteResult(viewedResult)}
            />
          )}
        {view === "hill" && user && !activeRun && !viewedResult && (
          <KingLibraryView
            packs={packs}
            results={results}
            runs={savedRuns}
            onBack={() => setView("modes")}
            onPacks={() => {
              setEditable(null);
              protectedNavigate("packs");
            }}
            onStart={(pack) => startPack(pack)}
            onContinue={(pack) => startPack(pack, true)}
            onOpenResult={(result) => {
              setViewedResult(result);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDeleteResult={(result) => void deleteResult(result)}
          />
        )}
        {view === "hill" &&
          user &&
          activeRun &&
          selectedPack &&
          activeRun.session.status === "active" && (
            <BattleView
              pack={selectedPack}
              run={activeRun}
              onPick={chooseWinner}
              onUndo={undo}
              onSkip={skip}
              onExit={() => setActiveRun(null)}
            />
          )}
        {view === "hill" &&
          user &&
          activeRun &&
          selectedPack &&
          activeRun.session.status === "complete" && (
            <ResultView
              pack={selectedPack}
              run={activeRun}
              onAgain={() => startPack(selectedPack)}
              onBack={() => setActiveRun(null)}
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
