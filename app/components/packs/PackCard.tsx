import type { Pack } from "../../../lib/types";
import { useI18n } from "../../i18n/I18nContext";
import { RemoteImage } from "../shared/RemoteImage";

export function PackCover({ pack }: { pack: Pack }) {
  return pack.coverType === "thumbnail" ? (
    <RemoteImage src={pack.coverValue} alt="" />
  ) : (
    <span className="emoji-pack-cover">{pack.coverValue}</span>
  );
}

export function PackTypeBadge() {
  const { t } = useI18n();
  return (
    <span className="pack-type-badge">
      <i aria-hidden="true">♫</i>
      <b>{t("MUSIC")}</b>
    </span>
  );
}
