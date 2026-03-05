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
    gtag: any;
    gtag: any;
  }
}

let translateInitialized = false;
let translateResolve: ((value: boolean) => void) | null = null;

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const translateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const hasTranslated = useRef(false);

  // Initialize Google Translate
  useEffect(() => {
    if (translateInitialized) return;
    translateInitialized = true;

    // Add CSS to hide Google Translate banner but keep widget accessible
    const style = document.createElement('style');
    style.id = 'google-translate-hide-style';
    style.textContent = `
      .goog-te-banner-frame { display: none !important; }
      .goog-te-gadget-simple { 
        display: inline-block !important;
        opacity: 0;
        position: absolute;
        pointer-events: none;
      }
      body { position: static !important; }
      .skiptranslate { display: block !important; }
      #goog-gt-tt { display: none !important; }
      .goog-te-balloon-frame { display: none !important; }
      .translation-box { display: none !important; }
    `;
    document.head.appendChild(style);

    // Set up callback - THIS IS CRUCIAL FOR GOOGLE TRANSLATE TO WORK
    (window as any).googleTranslateElementInit = () => {
      console.log('✅ Google Translate initialized');
      setIsWidgetReady(true);
      if (translateResolve) {
        translateResolve(true);
        translateResolve = null;
      }
    };

    // Create the Google Translate widget container
    const googleTranslateElement = document.createElement('div');
    googleTranslateElement.id = 'google_translate_element';
    googleTranslateElement.className = 'skiptranslate';
    googleTranslateElement.style.display = 'none';
    document.body.appendChild(googleTranslateElement);

    // Load Google Translate script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&hl=en';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('❌ Failed to load Google Translate');
    };
    document.head.appendChild(script);
  }, []);

  // Wait for Google Translate widget to be ready
  const waitForWidget = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      // If already ready, resolve immediately
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        resolve(true);
        return;
      }

      translateResolve = resolve;

      // Timeout after 10 seconds
      setTimeout(() => {
        if (translateResolve) {
          resolve(false);
          translateResolve = null;
        }
      }, 10000);
    });
  }, []);

  // Apply translation
  const applyTranslation = useCallback(async (lang: Language) => {
    const langInfo = getLanguageByCode(lang);
    if (!langInfo) return;

    // If English (original language), remove translation
    if (lang === 'en') {
      // Clear translation
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        select.value = '';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Clear cookies and reload
      document.cookie.split(';').forEach((c) => {
        document.cookie = c.trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
      });
      localStorage.removeItem('google_translate_language');
      
      window.location.reload();
      return;
    }

    console.log(`🌐 Translating to: ${langInfo.name}`);
    setIsTranslating(true);

    // Wait for widget to be ready
    const widgetReady = await waitForWidget();
    if (!widgetReady) {
      console.log('⚠️ Widget not ready, retrying...');
      // Try one more time after a delay
      await new Promise(r => setTimeout(r, 2000));
    }

    // Try to translate
    const doTranslate = (): boolean => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (!select) return false;

      try {
        select.value = langInfo.googleCode;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Save to localStorage
        localStorage.setItem('google_translate_language', lang);
        
        console.log(`✅ Translation set to: ${langInfo.name}`);
        return true;
      } catch (e) {
        console.error('Translation error:', e);
        return false;
      }
    };

    // Try multiple times with increasing delays
    const delays = [100, 200, 300, 500, 800, 1000, 1500, 2000];
    let success = false;
    
    for (const delay of delays) {
      await new Promise(r => setTimeout(r, delay));
      if (doTranslate()) {
        success = true;
        break;
      }
    }

    // If still not working, try URL-based translation
    if (!success) {
      console.log('🔄 Trying URL parameter method...');
      
      // Add parameter to URL
      const langParam = lang === 'zh-CN' ? 'zh-CN' : lang;
      const currentUrl = new URL(window.location.href);
      
      // Only add if not already there
      if (!currentUrl.searchParams.get('tl')) {
        currentUrl.searchParams.set('tl', langParam);
        // Note: We don't actually navigate to this URL as it would reload
        // Instead, we try to trigger translation via the DOM
      }
    }

    // Keep checking for a while
    const maintainInterval = setInterval(() => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select && select.value !== langInfo.googleCode) {
        select.value = langInfo.googleCode;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 3000);

    // Stop maintaining after 15 seconds
    setTimeout(() => {
      clearInterval(maintainInterval);
      setIsTranslating(false);
    }, 15000);

  }, [waitForWidget]);

  // Load saved language
  useEffect(() => {
    const saved = localStorage.getItem('website_language') as Language;
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      setCurrentLanguage(saved);
    }
  }, []);

  // Apply translation on mount if needed
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      const applyOnMount = async () => {
        // Wait for Google Translate to load
        await new Promise(r => setTimeout(r, 3000));
        
        if (currentLanguage !== 'en' && !hasTranslated.current) {
          hasTranslated.current = true;
          await applyTranslation(currentLanguage);
        }
      };
      applyOnMount();
    }
  }, []);

  // Set language function
  const setLanguage = useCallback(async (lang: Language) => {
    if (lang === currentLanguage) return;
    
    console.log('🔄 Changing language to:', lang);
    setIsTranslating(true);
    setCurrentLanguage(lang);
    localStorage.setItem('website_language', lang);
    hasTranslated.current = false;

    // Apply translation
    await applyTranslation(lang);
    
    // Reset translating state
    translateTimeoutRef.current = setTimeout(() => {
      setIsTranslating(false);
    }, 3000);
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
