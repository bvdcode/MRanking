import type { Pack } from "../../../lib/types";
import { RemoteImage } from "../shared/RemoteImage";

export function PackCover({ pack }: { pack: Pack }) {
  return pack.coverType === "thumbnail" ? (
    <RemoteImage src={pack.coverValue} alt="" />
  ) : (
    <span className="emoji-pack-cover">{pack.coverValue}</span>
  );
}
