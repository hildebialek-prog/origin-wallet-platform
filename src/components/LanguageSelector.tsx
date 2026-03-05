import { useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

type Variant = "desktop" | "mobile";

interface LanguageSelectorProps {
  variant?: Variant;
}

const LanguageSelector = ({ variant = "desktop" }: LanguageSelectorProps) => {
  const { currentLanguage, setLanguage, isTranslating } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find(l => l.code === currentLanguage) ?? LANGUAGES[0];

  const handleSelect = (code: (typeof current)["code"]) => {
    setOpen(false);
    setLanguage(code);
  };

  const wrapperClass =
    variant === "mobile"
      ? "w-full"
      : "relative";

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm border bg-background/80 hover:bg-muted transition ${
          isTranslating ? "opacity-70 cursor-wait" : ""
        }`}
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase text-xs">{current.code}</span>
        <span>{current.name}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="absolute z-40 mt-2 w-56 rounded-xl border bg-background shadow-lg overflow-hidden"
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-muted transition ${
                lang.code === currentLanguage ? "bg-muted/60" : ""
              }`}
            >
              <span className="mt-0.5 text-xs font-semibold w-8">
                {lang.code === "en" && "EN"}
                {lang.code === "vi" && "VN"}
                {lang.code === "zh-CN" && "CN"}
                {lang.code === "ja" && "JP"}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {lang.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {lang.nativeName}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;