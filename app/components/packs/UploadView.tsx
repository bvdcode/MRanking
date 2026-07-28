"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type {
  YouTubeImportResult,
  YouTubeProfilePreview,
} from "../../../lib/types";
import { useI18n } from "../../i18n/I18nContext";
import { api } from "../../lib/api";
import type { EditablePack } from "../../types";
import { FlowBack } from "../shared/FlowBack";
import type { MusicSource } from "./constants";
import { MusicSourceChooser } from "./MusicSourceChooser";
import { PackEditor } from "./PackEditor";
import { ProfilePlaylistPicker } from "./ProfilePlaylistPicker";

export function UploadView({
  editable,
  onEditable,
  onSave,
  onBack,
}: {
  editable: EditablePack | null;
  onEditable: (value: EditablePack | null) => void;
  onSave: (value: EditablePack) => Promise<void>;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<"music" | null>(
    editable ? "music" : null,
  );
  const [source, setSource] = useState<MusicSource | null>(
    editable
      ? editable.sourceType === "spotify"
        ? "spotify"
        : editable.sourceType === "yandexMusic"
          ? "yandex"
          : "youtube"
      : null,
  );
  const [url, setUrl] = useState(editable?.sourceUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<YouTubeProfilePreview | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const isEditing = editable !== null;
  const hasProfile = profile !== null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [category, hasProfile, isEditing, source]);

  async function loadMusicUrl(nextUrl: string, preserveProfile = false) {
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    setLoading(true);
    setError("");
    try {
      const endpoint =
        source === "spotify"
          ? "/api/spotify"
          : source === "yandex"
            ? "/api/yandex-music"
            : "/api/youtube";
      const data = await api<YouTubeImportResult>(endpoint, {
        method: "POST",
        body: JSON.stringify({ url: nextUrl }),
        signal: requestController.signal,
      });
      if (!mounted.current || controller.current !== requestController) {
        return;
      }
      if (data.kind === "profile") {
        setProfile(data.profile);
        return;
      }
      if (!preserveProfile) {
        setProfile(null);
      }
      onEditable({
        name: data.playlist.title,
        sourceType: data.playlist.sourceType,
        sourceUrl: data.playlist.sourceUrl,
        coverType: "thumbnail",
        coverValue: data.playlist.cover,
        skipped: data.playlist.skipped,
        duplicates: data.playlist.duplicates,
        issues: data.playlist.issues ?? [],
        selectedVideoIds: data.playlist.items.map((item) => item.videoId),
        items: data.playlist.items,
      });
    } catch (nextError) {
      if (
        mounted.current &&
        controller.current === requestController &&
        (nextError as Error).name !== "AbortError"
      ) {
        setError((nextError as Error).message);
      }
    } finally {
      if (mounted.current && controller.current === requestController) {
        controller.current = null;
        setLoading(false);
      }
    }
  }

  async function readPlaylist(event: FormEvent) {
    event.preventDefault();
    await loadMusicUrl(url);
  }

  const serviceTitle =
    source === "spotify"
      ? "Spotify"
      : source === "yandex"
        ? "Yandex Music"
        : "YouTube / YouTube Music";
  const serviceIcon =
    source === "spotify" ? "●" : source === "yandex" ? "Я" : "▶";
  const servicePrompt =
    source === "youtube"
      ? "Paste playlist or profile link"
      : "Paste playlist link";
  const serviceCopy =
    source === "spotify"
      ? "Use a public Spotify playlist."
      : source === "yandex"
        ? "Use a public Yandex Music playlist."
        : "Use a public playlist or profile from YouTube or YouTube Music.";
  const servicePlaceholder =
    source === "spotify"
      ? "https://open.spotify.com/playlist/..."
      : source === "yandex"
        ? "https://music.yandex.ru/users/.../playlists/..."
        : "https://youtube.com/@profile or https://music.youtube.com/@profile";

  if (editable) {
    return (
      <PackEditor
        value={editable}
        onChange={onEditable}
        onBack={() => {
          const editingExistingPack = Boolean(editable.id);
          onEditable(null);
          setError("");
          setUrl("");
          if (editingExistingPack) {
            setCategory(null);
            setSource(null);
            setProfile(null);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onSave={async () => {
          setSaving(true);
          try {
            const editingExistingPack = Boolean(editable.id);
            const selected = new Set(editable.selectedVideoIds);
            const selectedItems = editable.items.filter((item) =>
              selected.has(item.videoId),
            );
            await onSave({
              ...editable,
              selectedVideoIds: selectedItems.map((item) => item.videoId),
              items: selectedItems,
            });
            if (!editingExistingPack) {
              setCategory(null);
              setSource(null);
              setUrl("");
              setProfile(null);
            }
          } catch (nextError) {
            setError((nextError as Error).message);
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
        error={error}
      />
    );
  }

  return (
    <section className="page-wrap upload-view">
      {!category && <FlowBack label="Back" onClick={onBack} />}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>01 / {t("INPUT")}
          </div>
          <h2>{t("Choose a source")}</h2>
          <p>
            {t("Turn a link, file or collection into something you can rank.")}
          </p>
        </div>
      </div>
      <MusicSourceChooser
        category={category}
        source={source}
        onChooseCategory={() => setCategory("music")}
        onChooseSource={setSource}
        onBack={() => {
          setCategory(null);
          setSource(null);
          setUrl("");
          setProfile(null);
          setError("");
        }}
      />
      {source && !loading && !profile && (
        <form className="playlist-form" onSubmit={readPlaylist}>
          <FlowBack
            label="Back"
            onClick={() => {
              setSource(null);
              setUrl("");
              setProfile(null);
              setError("");
            }}
          />
          <div className="playlist-form-icon">{serviceIcon}</div>
          <span className="modal-kicker">{t(serviceTitle)}</span>
          <h3>{t(servicePrompt)}</h3>
          <p>{t(serviceCopy)}</p>
          <div className="url-entry">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={servicePlaceholder}
              autoComplete="off"
              required
            />
            <button className="button primary" type="submit">
              {t("Read link")}
              <span>↗</span>
            </button>
          </div>
          {error && <div className="form-error">{t(error)}</div>}
        </form>
      )}
      {profile && !loading && (
        <>
          <ProfilePlaylistPicker
            profile={profile}
            onBack={() => {
              setProfile(null);
              setUrl("");
              setError("");
            }}
            onRetry={() => loadMusicUrl(profile.sourceUrl)}
            onChoose={(playlist) => loadMusicUrl(playlist.url, true)}
          />
          {error && (
            <div className="form-error profile-import-error">{t(error)}</div>
          )}
        </>
      )}
      {loading && (
        <div className="import-loader">
          <div className="loader-orbit">
            <span>▶</span>
            <i />
            <i />
            <i />
          </div>
          <div>
            <span className="modal-kicker">{t("IMPORTING")}</span>
            <h3>{t("Reading link")}</h3>
            <p>{t("Looking for a playlist or public profile.")}</p>
            <div className="loading-bar">
              <i />
            </div>
            <FlowBack
              label="Back"
              onClick={() => {
                controller.current?.abort();
                setUrl("");
                setError("");
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
