import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

// Ngôn ngữ được hỗ trợ
export type Language = 'en' | 'vi' | 'zh-CN' | 'ja';

export interface LanguageOption {
  code: Language;
  nameEn: string;
  name: string;
  nativeName: string;
  flag: string;
  googleCode: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', nameEn: 'English', name: 'English', nativeName: 'English', flag: '🇺🇸', googleCode: 'en' },
  { code: 'vi', nameEn: 'Vietnamese', name: 'Tiếng Việt', nativeName: 'Tiếng Việt', flag: '🇻🇳', googleCode: 'vi' },
  { code: 'zh-CN', nameEn: 'Chinese', name: '中文', nativeName: '中文', flag: '🇨🇳', googleCode: 'zh-CN' },
  { code: 'ja', nameEn: 'Japanese', name: '日本語', nativeName: '日本語', flag: '🇯🇵', googleCode: 'ja' },
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

// Declare global
declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const isFirstRender = useRef(true);

  // Check if Google Translate is ready
  useEffect(() => {
    // Wait for Google Translate widget to be ready
    const checkGoogle = () => {
      const combo = document.querySelector('.goog-te-combo');
      if (combo) {
        console.log('✅ Google Translate widget ready');
        setIsReady(true);
        return true;
      }
      return false;
    };

    // Check immediately and then periodically
    if (!checkGoogle()) {
      const interval = setInterval(() => {
        if (checkGoogle()) {
          clearInterval(interval);
        }
      }, 300);

      // Also check when Google callback fires
      const originalInit = window.googleTranslateElementInit;
      window.googleTranslateElementInit = () => {
        console.log('🔄 Google Translate callback fired');
        if (originalInit) originalInit();
        setTimeout(checkGoogle, 500);
      };

      return () => clearInterval(interval);
    }
  }, []);

  // Apply translation
  const doTranslate = useCallback(async (langCode: string): Promise<boolean> => {
    return new Promise((resolve) => {
      console.log(`🌐 Translating to: ${langCode}`);

      let attempts = 0;
      const maxAttempts = 30;
      const interval = 150;

      const attempt = () => {
        attempts++;

        // Find the Google Translate combo box
        const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        
        if (combo) {
          try {
            combo.value = langCode;
            combo.dispatchEvent(new Event('change', { bubbles: true }));
            localStorage.setItem('google_translate_language', langCode);
            console.log(`✅ Translation applied: ${langCode}`);
            resolve(true);
            return;
          } catch (e) {
            console.log('Translation error:', e);
          }
        }

        // Also try finding by ID
        const selectById = document.getElementById(':0') as HTMLSelectElement;
        if (selectById) {
          try {
            selectById.value = langCode;
            selectById.dispatchEvent(new Event('change', { bubbles: true }));
            localStorage.setItem('google_translate_language', langCode);
            console.log(`✅ Translation applied (method 2): ${langCode}`);
            resolve(true);
            return;
          } catch (e) {
            console.log('Method 2 error:', e);
          }
        }

        if (attempts >= maxAttempts) {
          console.log('⚠️ Max attempts reached, using cookie method...');
          
          // Fallback: Cookie method
          const domain = window.location.hostname;
          document.cookie = `googtrans=/en/${langCode}; path=/`;
          document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain}`;
          
          // Reload with language parameter
          const url = new URL(window.location.href);
          url.searchParams.set('tl', langCode);
          window.location.href = url.toString();
          
          resolve(false);
          return;
        }

        setTimeout(attempt, interval);
      };

      attempt();
    });
  }, []);

  // Apply saved language on mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      // Wait for Google to be ready
      const applySaved = async () => {
        // Wait for widget or timeout
        let waited = 0;
        while (!isReady && waited < 5000) {
          await new Promise(r => setTimeout(r, 200));
          waited += 200;
        }

        // Additional wait for Google to fully initialize
        await new Promise(r => setTimeout(r, 1500));

        // Check URL first
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('tl');
        
        // Then localStorage
        const savedLang = localStorage.getItem('website_language');
        
        const targetLang = urlLang || savedLang;
        
        if (targetLang && targetLang !== 'en') {
          const langInfo = getLanguageByCode(targetLang);
          if (langInfo) {
            setCurrentLanguage(langInfo.code);
            await doTranslate(langInfo.googleCode);
          }
        }
      };

      applySaved();
    }
  }, [isReady, doTranslate]);

  // Set language function
  const setLanguage = useCallback(async (lang: Language) => {
    if (lang === currentLanguage) return;
    
    console.log('🔄 Changing language to:', lang);
    setIsTranslating(true);
    setCurrentLanguage(lang);
    localStorage.setItem('website_language', lang);

    if (lang === 'en') {
      // Reset
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
      localStorage.removeItem('google_translate_language');
      
      // Reload without language param
      const url = new URL(window.location.href);
      url.searchParams.delete('tl');
      window.location.href = url.toString();
    } else {
      const langInfo = getLanguageByCode(lang);
      if (langInfo) {
        await doTranslate(langInfo.googleCode);
      }
    }

    setTimeout(() => setIsTranslating(false), 2000);
  }, [currentLanguage, doTranslate]);

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
