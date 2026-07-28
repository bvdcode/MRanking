"use client";

import type {
  ProfilePlaylistPreview,
  YouTubeProfilePreview,
} from "../../../lib/types";
import { useI18n } from "../../i18n/I18nContext";
import { FlowBack } from "../shared/FlowBack";
import { RemoteImage } from "../shared/RemoteImage";

export function ProfilePlaylistPicker({
  profile,
  onBack,
  onRetry,
  onChoose,
}: {
  profile: YouTubeProfilePreview;
  onBack: () => void;
  onRetry: () => void;
  onChoose: (playlist: ProfilePlaylistPreview) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="profile-playlist-picker">
      <FlowBack label="Back" onClick={onBack} />
      <div className="profile-import-head">
        <div className="profile-import-avatar">
          <span className="profile-avatar-placeholder" aria-hidden="true" />
          {profile.avatarUrl && (
            <RemoteImage
              src={profile.avatarUrl}
              alt=""
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          )}
        </div>
        <div>
          <span className="modal-kicker">{t("PUBLIC PROFILE")}</span>
          <h3>{profile.title}</h3>
          <p>
            {profile.playlists.length} {t("public playlists")}
          </p>
        </div>
      </div>
      {profile.playlists.length === 0 ? (
        <div className="profile-playlist-empty">
          <span>∅</span>
          <h4>{t("No public playlists found")}</h4>
          <p>{t("Only public playlists can be imported.")}</p>
          <button className="button ghost" onClick={onRetry}>
            {t("Try again")}
          </button>
        </div>
      ) : (
        <div className="profile-playlist-grid">
          {profile.playlists.map((playlist) => (
            <button
              key={playlist.playlistId}
              onClick={() => onChoose(playlist)}
            >
              <span className="profile-playlist-art">
                {playlist.thumbnailUrl ? (
                  <RemoteImage
                    src={playlist.thumbnailUrl}
                    alt=""
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      const ratio = image.naturalHeight
                        ? image.naturalWidth / image.naturalHeight
                        : 1;
                      image.dataset.artShape =
                        Math.abs(ratio - 1) <= 0.08 ? "square" : "wide";
                    }}
                  />
                ) : (
                  <i>♫</i>
                )}
                <b>↗</b>
              </span>
              <span className="profile-playlist-copy">
                <strong>{playlist.title}</strong>
                <small>
                  {playlist.itemCount === null
                    ? t("Playlist")
                    : `${playlist.itemCount} ${t("videos")}`}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
