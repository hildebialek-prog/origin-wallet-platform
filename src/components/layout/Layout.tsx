import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsent";
import { Globe, X } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

const Layout = () => {
  const { currentLanguage, setLanguage, isTranslating } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const currentLang = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];

  const handleLanguageChange = (lang: 'vi' | 'en' | 'zh-CN' | 'ja') => {
    setLanguage(lang);
    setShowLangMenu(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
      <CookieConsent />

      {/* Floating Language Button - Mobile Friendly */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className={`flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/45 bg-[radial-gradient(circle_at_30%_20%,#1fd190_0%,#0f9f63_42%,#071615_100%)] text-white shadow-[0_20px_48px_-20px_rgba(16,185,129,0.9)] ring-1 ring-emerald-200/20 transition-all hover:scale-110 hover:shadow-[0_24px_56px_-18px_rgba(16,185,129,0.95)] ${
              isTranslating ? 'animate-pulse' : ''
            }`}
            title="Change language"
            aria-label="Change language"
          >
            {isTranslating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-2xl">{currentLang.flag}</span>
            )}
          </button>

          {/* Language Menu - Better Mobile Positioning */}
          {showLangMenu && (
            <>
              {/* Backdrop for mobile */}
              <div 
                className="fixed inset-0 z-40 md:hidden"
                onClick={() => setShowLangMenu(false)}
              />
              
              {/* Menu - Center on mobile, right on desktop */}
              <div className="absolute bottom-16 right-0 z-50 w-64 overflow-hidden rounded-2xl border border-emerald-200/60 bg-white shadow-[0_24px_70px_-32px_rgba(2,9,8,0.8)] animate-in fade-in slide-in-from-bottom-2 duration-200 sm:w-56 dark:border-emerald-900/60 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                    Select Language
                  </p>
                  <button
                    onClick={() => setShowLangMenu(false)}
                    className="rounded-full p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                  >
                    <X className="h-4 w-4 text-emerald-900 dark:text-emerald-200" />
                  </button>
                </div>
                <div className="p-2 max-h-[70vh] overflow-y-auto">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                        lang.code === currentLanguage
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'text-gray-900 hover:bg-emerald-50 dark:text-white dark:hover:bg-emerald-900/20'
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{lang.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{lang.nativeName}</span>
                      </div>
                      {lang.code === currentLanguage && (
                        <svg className="ml-auto h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                
                {/* Language info */}
                <div className="border-t border-emerald-100 bg-emerald-50/55 px-4 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <p className="flex items-center gap-1 text-xs text-emerald-900/65 dark:text-emerald-100/70">
                    <Globe className="h-3 w-3" />
                    Translated by Google
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Layout;
