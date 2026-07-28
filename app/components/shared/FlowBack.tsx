"use client";

import { useI18n } from "../../i18n/I18nContext";

export function FlowBack({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="flow-back"
      onClick={onClick}
    >
      <span aria-hidden="true">←</span>
      {t(label)}
    </button>
  );
}
