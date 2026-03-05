import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { useLanguage, LANGUAGES, Language } from '@/contexts/LanguageContext';

interface LanguageSelectorProps {
  variant?: 'header' | 'mobile';
}

export function LanguageSelector({ variant = 'header' }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentLanguage, setLanguage, isTranslating } = useLanguage();
  
  const currentLang = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  if (variant === 'mobile') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Ngôn ngữ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentLang.flag}</span>
            <span className="font-medium">{currentLang.nativeName}</span>
            {isTranslating && (
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
        
        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  lang.code === currentLanguage ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <span className={`font-medium ${lang.code === currentLanguage ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {lang.nativeName}
                  </span>
                </div>
                {lang.code === currentLanguage && <Check className="w-5 h-5 text-blue-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Header variant
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Globe className="w-5 h-5 text-blue-600" />
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:inline">
          {currentLang.nativeName}
        </span>
        {isTranslating && (
          <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                lang.code === currentLanguage ? 'bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <div className="flex-1 text-left">
                <p className={`font-medium ${lang.code === currentLanguage ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {lang.nativeName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{lang.name}</p>
              </div>
              {lang.code === currentLanguage && <Check className="w-5 h-5 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
