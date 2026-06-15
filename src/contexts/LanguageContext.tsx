import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

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

const installGoogleTranslateDomGuard = () => {
  if (window.originWalletGoogleTranslateDomGuardInstalled || typeof Node === "undefined") {
    return;
  }

  window.originWalletGoogleTranslateDomGuardInstalled = true;

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function removeChild<T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      return child;
    }

    return originalRemoveChild.call(this, child) as T;
  };

  Node.prototype.insertBefore = function insertBefore<T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode) as T;
    }

    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
};

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const setGoogleTranslateCookie = (langCode: string) => {
  const cookieValue = `/en/${langCode}`;
  const domain = window.location.hostname;

  document.cookie = `googtrans=${cookieValue}; path=/`;
  document.cookie = `googtrans=${cookieValue}; path=/; domain=${domain}`;
};

const clearGoogleTranslateCookie = () => {
  const domain = window.location.hostname;

  document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
  document.cookie = `googtrans=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
};

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    originWalletGoogleTranslateDomGuardInstalled?: boolean;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    installGoogleTranslateDomGuard();
  }, []);

  useEffect(() => {
    const checkGoogle = () => {
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        setIsReady(true);
        return true;
      }
      return false;
    };

    if (!checkGoogle()) {
      const interval = window.setInterval(() => {
        if (checkGoogle()) {
          window.clearInterval(interval);
        }
      }, 300);

      const originalInit = window.googleTranslateElementInit;
      window.googleTranslateElementInit = () => {
        originalInit?.();
        window.setTimeout(checkGoogle, 500);
      };

      return () => window.clearInterval(interval);
    }
  }, []);

  const doTranslate = useCallback(async (langCode: string): Promise<boolean> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;
      const interval = 150;

      if (langCode === "en") {
        clearGoogleTranslateCookie();
      } else {
        setGoogleTranslateCookie(langCode);
      }

      const applyToSelect = (select: HTMLSelectElement) => {
        const optionValues = Array.from(select.options).map((option) => option.value);
        const targetValue = optionValues.includes(langCode) ? langCode : langCode === "en" && optionValues.includes("") ? "" : null;
        if (targetValue === null) {
          return false;
        }

        select.value = targetValue;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));

        return select.value === targetValue;
      };

      const attempt = () => {
        attempts += 1;

        const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
        if (combo) {
          try {
            if (applyToSelect(combo)) {
              localStorage.setItem("google_translate_language", langCode);
              resolve(true);
              return;
            }
          } catch {
            // Ignore and continue retrying.
          }
        }

        const selectById = document.getElementById(":0") as HTMLSelectElement | null;
        if (selectById) {
          try {
            if (applyToSelect(selectById)) {
              localStorage.setItem("google_translate_language", langCode);
              resolve(true);
              return;
            }
          } catch {
            // Ignore and continue retrying.
          }
        }

        if (attempts >= maxAttempts) {
          resolve(false);
          return;
        }

        window.setTimeout(attempt, interval);
      };

      attempt();
    });
  }, []);

  useEffect(() => {
    if (!isFirstRender.current) {
      return;
    }

    isFirstRender.current = false;

    const applySaved = async () => {
      let waited = 0;
      while (!isReady && waited < 5000) {
        await new Promise((resolve) => window.setTimeout(resolve, 200));
        waited += 200;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1500));

      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get("tl");
      const savedLang = localStorage.getItem("website_language");
      const targetLang = urlLang || savedLang;

      if (targetLang && targetLang !== "en") {
        const langInfo = getLanguageByCode(targetLang);
        if (langInfo) {
          setCurrentLanguage(langInfo.code);
          await doTranslate(langInfo.googleCode);
        }
      }
    };

    void applySaved();
  }, [doTranslate, isReady]);

  const setLanguage = useCallback(
    async (lang: Language) => {
      if (lang === currentLanguage) {
        const langInfo = getLanguageByCode(lang);
        if (langInfo && lang !== "en") {
          setIsTranslating(true);
          await wait(120);
          setIsTranslating(false);
          await wait(50);
          await doTranslate(langInfo.googleCode);
        }
        return;
      }

      setIsTranslating(true);
      setCurrentLanguage(lang);
      localStorage.setItem("website_language", lang);

      if (lang === "en") {
        clearGoogleTranslateCookie();
        localStorage.removeItem("google_translate_language");
        await wait(120);
        setIsTranslating(false);
        await wait(50);
        await doTranslate("en");
      } else {
        const langInfo = getLanguageByCode(lang);
        if (langInfo) {
          await wait(120);
          setIsTranslating(false);
          await wait(50);
          await doTranslate(langInfo.googleCode);
        }
      }
    },
    [currentLanguage, doTranslate],
  );

  return <LanguageContext.Provider value={{ currentLanguage, setLanguage, isTranslating }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
