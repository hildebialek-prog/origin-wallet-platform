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
  }
}

let translateInitialized = false;

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const translateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const hasTranslated = useRef(false);

  // Initialize Google Translate
  useEffect(() => {
    if (translateInitialized) return;
    translateInitialized = true;

    // Add CSS to hide Google Translate elements
    const style = document.createElement('style');
    style.id = 'google-translate-hide-style';
    style.textContent = `
      .goog-te-banner-frame { display: none !important; }
      .goog-te-gadget-simple { display: none !important; }
      .goog-te-gadget { display: none !important; }
      body { position: static !important; }
      .skiptranslate { display: none !important; }
      #goog-gt-tt { display: none !important; }
      .goog-te-balloon-frame { display: none !important; }
      #googly-translate-button { display: none !important; }
      .translation-box { display: none !important; }
    `;
    document.head.appendChild(style);

    // Set up callback
    (window as any).googleTranslateElementInit = () => {
      console.log('✅ Google Translate initialized');
    };

    // Load Google Translate script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('❌ Failed to load Google Translate');
    };
    document.head.appendChild(script);
  }, []);

  // Hàm dịch bằng Google Translate
  const applyTranslation = useCallback(async (lang: Language) => {
    const langInfo = getLanguageByCode(lang);
    if (!langInfo) return;

    // Nếu là tiếng Anh (ngôn ngữ gốc), xóa dịch
    if (lang === 'en') {
      // Remove translation
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        select.value = '';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Reload page to clear all translations
      window.location.reload();
      return;
    }

    console.log(`🌐 Translating to: ${langInfo.name} (${langInfo.googleCode})`);
    setIsTranslating(true);

    // Wait for Google Translate to be ready
    const waitForTranslate = () => {
      return new Promise<void>((resolve) => {
        let attempts = 0;
        const maxAttempts = 20;
        
        const check = () => {
          attempts++;
          const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
          
          if (select) {
            resolve();
          } else if (attempts < maxAttempts) {
            setTimeout(check, 200);
          } else {
            // Force reload if widget not found
            console.log('⚠️ Widget not found, trying force reload method');
            resolve();
          }
        };
        
        check();
      });
    };

    await waitForTranslate();

    // Apply translation
    const doTranslate = (): boolean => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (!select) return false;

      try {
        select.value = langInfo.googleCode;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Also try triggering via gtag if available
        if (window.gtag) {
          window.gtag('event', 'conversion', {
            'send_to': 'AW-123456789'
          });
        }
        
        console.log(`✅ Translation triggered for: ${langInfo.name}`);
        return true;
      } catch (e) {
        console.error('Translation error:', e);
        return false;
      }
    };

    // Try multiple times with increasing delays
    const delays = [100, 300, 500, 800, 1200, 2000];
    let success = false;
    
    for (const delay of delays) {
      await new Promise(r => setTimeout(r, delay));
      if (doTranslate()) {
        success = true;
        break;
      }
    }

    // If still not working, try direct URL parameter method
    if (!success) {
      console.log('🔄 Trying alternative translation method...');
      
      // Method 2: Create and click the select element
      const createWidget = () => {
        const container = document.getElementById('google_translate_element');
        if (!container) return false;
        
        // Trigger translation via the widget if it exists
        const select = container.querySelector('.goog-te-combo') as HTMLSelectElement;
        if (select) {
          select.value = langInfo.googleCode;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      };
      
      if (!createWidget()) {
        // Method 3: Use meta tag for translation
        const meta = document.createElement('meta');
        meta.name = 'google-translate-customization';
        meta.content = '9f3e8a4c6f7e8a4c';
        document.head.appendChild(meta);
      }
    }

    // Keep checking and maintaining translation
    const maintainInterval = setInterval(() => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select && select.value !== langInfo.googleCode) {
        select.value = langInfo.googleCode;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 2000);

    // Stop maintaining after 10 seconds
    setTimeout(() => {
      clearInterval(maintainInterval);
      setIsTranslating(false);
    }, 10000);

  }, []);

  // Load saved language từ localStorage
  useEffect(() => {
    const saved = localStorage.getItem('website_language') as Language;
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      setCurrentLanguage(saved);
    }
  }, []);

  // Apply translation khi mount (chỉ 1 lần)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      // Apply sau khi DOM ready
      const applyOnMount = async () => {
        await new Promise(r => setTimeout(r, 2000));
        
        // Only translate if not English
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
    
    // Reset translating state after a delay
    translateTimeoutRef.current = setTimeout(() => {
      setIsTranslating(false);
    }, 2000);
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
