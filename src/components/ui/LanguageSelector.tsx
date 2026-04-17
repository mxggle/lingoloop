import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {languages.map((language) => (
        <button
          key={language.code}
          onClick={() => handleLanguageChange(language.code)}
          className={cn(
            "flex flex-col items-start p-3 rounded-xl border-2 transition-all duration-300 text-left",
            i18n.language === language.code
              ? "border-primary-500 bg-primary-500/5 dark:bg-primary-500/10"
              : "border-black/5 dark:border-white/5 bg-white/40 dark:bg-gray-900/40 hover:border-primary-500/30"
          )}
        >
          <span className={cn(
            "text-sm font-bold",
            i18n.language === language.code ? "text-primary-700 dark:text-primary-300" : "text-gray-900 dark:text-white"
          )}>
            {language.nativeName}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 opacity-60">
            {language.name}
          </span>
        </button>
      ))}
    </div>
  );
};
