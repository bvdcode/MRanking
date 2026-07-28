"use client";

import { createContext, useContext } from "react";
import { RU_TRANSLATIONS } from "./translations/ru";
import { UK_TRANSLATIONS } from "./translations/uk";

export type Language = "en" | "ru" | "uk";
export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const TRANSLATIONS: Record<Exclude<Language, "en">, Record<string, string>> = {
  ru: RU_TRANSLATIONS,
  uk: UK_TRANSLATIONS,
};

export const I18nContext = createContext<{ language: Language; t: Translate }>({
  language: "en",
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function translate(
  language: Language,
  key: string,
  values?: Record<string, string | number>,
): string {
  let output = language === "en" ? key : (TRANSLATIONS[language][key] ?? key);
  for (const [name, value] of Object.entries(values ?? {})) {
    output = output.replaceAll(`{${name}}`, String(value));
  }
  return output;
}
