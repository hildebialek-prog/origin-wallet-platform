import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe, Check } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

type Variant = "desktop" | "mobile";

interface LanguageSelectorProps {
  variant?: Variant;
  compact?: boolean;
}

const LanguageSelector = ({ variant = "desktop", compact = false }: LanguageSelectorProps) => {
  const { currentLanguage, setLanguage, isTranslating } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === currentLanguage) ?? LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    setOpen(false);
    setLanguage(code as 'en' | 'vi' | 'zh-CN' | 'ja');
  };

  const isMobile = variant === "mobile";

  return (
    <div className={isMobile ? "w-full" : "relative"} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-between gap-2 rounded-xl border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
          isTranslating ? "opacity-70 cursor-wait" : ""
        } ${
          isMobile
            ? "w-full px-4 py-3 shadow-sm"
            : compact
              ? "min-w-[120px] px-3 py-2.5"
              : "px-4 py-3"
        }`}
      >
        <div className="flex items-center gap-3">
          {isTranslating ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-2xl">{current.flag}</span>
          )}
          {compact && !isMobile ? (
            <span className="font-semibold text-foreground">{current.code.toUpperCase()}</span>
          ) : (
            <div className="flex flex-col items-start">
              <span className="font-semibold text-foreground">{current.name}</span>
              <span className="text-xs text-muted-foreground">{current.nativeName}</span>
            </div>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-full min-w-[260px] rounded-xl border bg-white dark:bg-gray-800 shadow-xl overflow-hidden ${
            isMobile ? "static mt-2" : ""
          } ${!isMobile ? "right-0" : ""}`}
        >
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-blue-50 dark:hover:bg-gray-700 transition ${
                  lang.code === currentLanguage ? "bg-blue-100 dark:bg-blue-900/30" : ""
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="flex flex-col flex-1">
                  <span className="font-medium text-foreground">
                    {lang.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lang.nativeName}
                  </span>
                </div>
                {lang.code === currentLanguage && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </button>
            ))}
          </div>
          
          {/* Footer info */}
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-t text-xs text-muted-foreground flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Translated by Google
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
