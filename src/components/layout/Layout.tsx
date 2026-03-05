import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsent";
import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Layout = () => {
  const { currentLanguage, setLanguage, isTranslating } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const languages = [
    { code: 'vi' as const, name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'zh-CN' as const, name: '中文', flag: '🇨🇳' },
    { code: 'ja' as const, name: '日本語', flag: '🇯🇵' },
  ];

  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];

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

      {/* Floating Language Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className={`w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center ${
              isTranslating ? 'animate-pulse' : ''
            }`}
            title="Đổi ngôn ngữ"
          >
            <span className="text-2xl">{currentLang.flag}</span>
          </button>

          {/* Language Menu */}
          {showLangMenu && (
            <div className="absolute bottom-16 right-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2">
                  Chọn ngôn ngữ
                </p>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      lang.code === currentLanguage
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                    {lang.code === currentLanguage && (
                      <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Layout;
