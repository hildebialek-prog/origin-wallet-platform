import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

// Ngôn ngữ được hỗ trợ
export type Language = 'en' | 'vi' | 'zh-CN' | 'ja';

export interface LanguageOption {
  code: Language;
  name: string;
  nameEn: string;
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
    GT_app: any;
  }
}

// Translation state
let isTranslateReady = false;
let translationResolve: ((value: boolean) => void) | null = null;

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const isFirstRender = useRef(true);
  const translateInitRef = useRef(false);

  // Initialize Google Translate ONCE
  useEffect(() => {
    if (translateInitRef.current) return;
    translateInitRef.current = true;

    console.log('🔄 Initializing Google Translate...');

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'google-translate-widget';
    widgetContainer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    document.body.appendChild(widgetContainer);

    // Create hidden select for translation
    const select = document.createElement('select');
    select.id = 'gt-auto-translate';
    select.className = 'goog-te-combo';
    select.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;';
    select.setAttribute('aria-hidden', 'true');
    widgetContainer.appendChild(select);

    // Callback function
    (window as any).googleTranslateElementInit = () => {
      console.log('✅ Google Translate callback fired');
      
      // Find the combo box that Google creates
      const checkForCombo = () => {
        const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (combo) {
          console.log('✅ Google Translate combo found');
          isTranslateReady = true;
          if (translationResolve) {
            translationResolve(true);
            translationResolve = null;
          }
        }
      };

      // Check immediately and after a delay
      checkForCombo();
      setTimeout(checkForCombo, 500);
      setTimeout(checkForCombo, 1000);
      setTimeout(checkForCombo, 2000);
    };

    // Load the script
    const script1 = document.createElement('script');
    script1.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script1.async = true;
    script1.defer = true;
    document.head.appendChild(script1);

    // Backup: if main script fails
    script1.onerror = () => {
      console.log('⚠️ Primary script failed, trying backup...');
      const script2 = document.createElement('script');
      script2.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script2.async = true;
      script2.defer = true;
      document.head.appendChild(script2);
    };
  }, []);

  // Translation function - SIMPLE & RELIABLE
  const translate = useCallback(async (langCode: string): Promise<boolean> => {
    return new Promise((resolve) => {
      console.log(`🌐 Attempting translation to: ${langCode}`);
      
      let attempts = 0;
      const maxAttempts = 15;
      
      const tryTranslate = () => {
        attempts++;
        
        // Method 1: Find Google's combo box
        const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
        
        if (combo) {
          try {
            combo.value = langCode;
            combo.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ Translation triggered: ${langCode}`);
            resolve(true);
            return;
          } catch (e) {
            console.log('⚠️ Combo method failed, trying other methods...');
          }
        }

        // Method 2: Direct URL with reload (most reliable)
        if (attempts >= maxAttempts) {
          console.log('🔄 Using URL-based translation fallback...');
          
          // Set cookie for translation
          document.cookie = `googtrans=/en/${langCode}; path=/`;
          document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
          
          // Reload to apply
          window.location.reload();
          resolve(false);
          return;
        }

        // Try again
        setTimeout(tryTranslate, 200);
      };

      tryTranslate();
    });
  }, []);

  // Apply translation on mount if needed
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      // Check for saved language
      const saved = localStorage.getItem('website_language') as Language;
      if (saved && LANGUAGES.some(l => l.code === saved) && saved !== 'en') {
        setCurrentLanguage(saved);
        
        // Wait for Google to load then translate
        const applySaved = async () => {
          await new Promise(r => setTimeout(r, 3000)); // Wait for Google
          const langInfo = getLanguageByCode(saved);
          if (langInfo) {
            await translate(langInfo.googleCode);
          }
        };
        applySaved();
      }
    }
  }, [translate]);

  // Set language function
  const setLanguage = useCallback(async (lang: Language) => {
    if (lang === currentLanguage) return;
    
    console.log('🔄 Changing language to:', lang);
    setIsTranslating(true);
    setCurrentLanguage(lang);
    localStorage.setItem('website_language', lang);

    const langInfo = getLanguageByCode(lang);
    if (langInfo) {
      if (lang === 'en') {
        // Reset to English
        document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
        document.cookie = 'googtrans=; path=/; domain=' + window.location.hostname + '; expires=Thu, 01 Jan 1970 00:00:00 UTC';
        localStorage.removeItem('google_translate_language');
        window.location.reload();
      } else {
        await translate(langInfo.googleCode);
      }
    }

    // Reset loading state
    setTimeout(() => setIsTranslating(false), 2000);
  }, [currentLanguage, translate]);

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
