import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type Language = "en" | "vi" | "zh-CN" | "ja";

export interface LanguageOption {
  code: Language;
  nameEn: string;
  name: string;
  nativeName: string;
  flag: string;
  googleCode: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", nameEn: "English", name: "English", nativeName: "English", flag: "US", googleCode: "en" },
  { code: "vi", nameEn: "Vietnamese", name: "Tieng Viet", nativeName: "Tiếng Việt", flag: "VN", googleCode: "vi" },
  { code: "zh-CN", nameEn: "Chinese", name: "Chinese", nativeName: "Chinese", flag: "CN", googleCode: "zh-CN" },
  { code: "ja", nameEn: "Japanese", name: "Japanese", nativeName: "Japanese", flag: "JP", googleCode: "ja" },
];

export const getLanguageByCode = (code: string): LanguageOption | undefined => {
  return LANGUAGES.find((lang) => lang.code === code);
};

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// AUTH-05.1: preferences remain available; translation execution is suspended.
export const TRANSLATION_NOTICE = "Translation is temporarily unavailable. Content is shown in English. Your language preference is saved.";

const savedLanguage = (): Language => {
  const fromUrl = getLanguageByCode(new URLSearchParams(window.location.search).get("tl") ?? "");
  if (fromUrl) return fromUrl.code;
  try {
    return getLanguageByCode(localStorage.getItem("website_language") ?? "")?.code
      ?? getLanguageByCode(localStorage.getItem("google_translate_language") ?? "")?.code ?? "en";
  } catch { return "en"; }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  // currentLanguage represents the saved preference, not the displayed content language.
  const [currentLanguage, setCurrentLanguage] = useState<Language>(savedLanguage);
  const setLanguage = useCallback((lang: Language) => {
    if (!getLanguageByCode(lang)) return;
    setCurrentLanguage(lang);
    try {
      localStorage.setItem("website_language", lang);
      localStorage.setItem("google_translate_language", lang);
    } catch { /* Storage restrictions must not interrupt authentication. */ }
  }, []);

  return <LanguageContext.Provider value={{ currentLanguage, setLanguage, isTranslating: false }}>
    <div role="status" aria-label="Translation availability" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
      {TRANSLATION_NOTICE}
    </div>
    {children}
  </LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
