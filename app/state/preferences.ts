import { create } from "zustand";
import type { Language } from "../i18n/I18nContext";

type PreferencesState = {
  language: Language;
  setLanguage: (language: Language) => void;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: "en",
  setLanguage: (language) => set({ language }),
}));
