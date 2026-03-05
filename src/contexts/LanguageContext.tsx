import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

// Ngôn ngữ được hỗ trợ
export type Language = 'en' | 'vi' | 'zh-CN' | 'ja';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  googleCode: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', googleCode: 'en' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', googleCode: 'vi' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', googleCode: 'zh-CN' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', googleCode: 'ja' },
];

export const getLanguageByCode = (code: string): LanguageOption | undefined => {
  return LANGUAGES.find(lang => lang.code === code);
};

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Declare global Google Translate function
declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}

let isGoogleTranslateLoaded = false;
let googleTranslateSelect: HTMLSelectElement | null = null;

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('vi');
  const [isTranslating, setIsTranslating] = useState(false);
  const isInitialMount = useRef(true);
  const translateAttempts = useRef(0);

  // Initialize Google Translate
  useEffect(() => {
    if (isGoogleTranslateLoaded) return;

    // Set up callback
    (window as any).googleTranslateElementInit = () => {
      isGoogleTranslateLoaded = true;
      console.log('✅ Google Translate loaded');
    };

    // Create script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = () => {
      console.error('❌ Failed to load Google Translate');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
    };
  }, []);

  // Apply translation function
  const applyTranslation = useCallback((lang: Language) => {
    translateAttempts.current++;
    const attempt = translateAttempts.current;

    // Try to find the select element
    const findSelect = () => {
      return document.querySelector('.goog-te-combo') as HTMLSelectElement;
    };

    const doTranslate = () => {
      const selectElement = findSelect();
      if (!selectElement) {
        console.log('⏳ Waiting for Google Translate widget...');
        if (attempt < 10) {
          setTimeout(doTranslate, 500);
        }
        return;
      }

      const langInfo = getLanguageByCode(lang);
      if (!langInfo) return;

      // Only change if different
      if (selectElement.value !== langInfo.googleCode) {
        console.log(`🌐 Translating to: ${langInfo.name} (${langInfo.googleCode})`);
        selectElement.value = langInfo.googleCode;
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    // Start translation attempts
    setTimeout(doTranslate, 1000);
    setTimeout(doTranslate, 2000);
    setTimeout(doTranslate, 3000);
  }, []);

  // Load saved language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('website_language') as Language;
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      setCurrentLanguage(saved);
    }
  }, []);

  // Apply translation on initial load and language change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Apply saved language after a delay
      setTimeout(() => applyTranslation(currentLanguage), 2000);
      setTimeout(() => applyTranslation(currentLanguage), 4000);
    }
  }, [currentLanguage, applyTranslation]);

  // Prevent React from re-rendering the page content that causes translation reset
  useEffect(() => {
    // Block Google Translate from resetting by storing the current selection
    const interval = setInterval(() => {
      const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (selectElement && currentLanguage !== 'vi') {
        const langInfo = getLanguageByCode(currentLanguage);
        if (langInfo && selectElement.value !== langInfo.googleCode) {
          // Restore translation if it was reset
          selectElement.value = langInfo.googleCode;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLanguage]);

  // Set language function
  const setLanguage = useCallback(async (lang: Language) => {
    if (lang === currentLanguage) return;
    
    console.log('🔄 Changing language to:', lang);
    setIsTranslating(true);
    setCurrentLanguage(lang);
    localStorage.setItem('website_language', lang);

    // Apply translation with retries
    setTimeout(() => applyTranslation(lang), 500);
    setTimeout(() => applyTranslation(lang), 1000);
    setTimeout(() => applyTranslation(lang), 2000);
    setTimeout(() => applyTranslation(lang), 3000);

    setTimeout(() => setIsTranslating(false), 3000);
  }, [currentLanguage, applyTranslation]);

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
