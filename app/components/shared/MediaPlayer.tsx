"use client";

import { useState } from "react";
import type { PackItem, SourceType } from "../../../lib/types";
import { mediaPlayerUrl } from "../../domain/pack";
import { useI18n } from "../../i18n/I18nContext";
import { RemoteImage } from "./RemoteImage";

export function MediaPlayer({
  item,
  sourceType,
}: {
  item: PackItem;
  sourceType: SourceType;
}) {
  const { t } = useI18n();
  const [playbackFailed, setPlaybackFailed] = useState(false);

  if (sourceType !== "yandexMusic") {
    return (
      <iframe
        src={mediaPlayerUrl(sourceType, item)}
        title={item.title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <div className="yandex-audio-player">
      <RemoteImage src={item.thumbnailUrl} alt="" />
      {playbackFailed ? (
        <p className="yandex-audio-error" role="alert">
          {t("Yandex Music preview is unavailable")}
        </p>
      ) : (
        <audio
          autoPlay
          controls
          controlsList="nodownload noplaybackrate"
          preload="metadata"
          src={mediaPlayerUrl(sourceType, item)}
          aria-label={t("Yandex Music preview")}
          onError={() => setPlaybackFailed(true)}
        />
      )}
    </div>
  );
}
