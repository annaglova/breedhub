import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './translations/en';
import { uk } from './translations/uk';

type Translations = typeof en;
type Language = 'en' | 'uk';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const translations: Record<Language, Translations> = {
  en,
  uk,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Get initial language from localStorage or browser settings
function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  
  // Check localStorage first
  const savedLang = localStorage.getItem('language');
  if (savedLang === 'en' || savedLang === 'uk') {
    return savedLang;
  }
  
  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('uk')) {
    return 'uk';
  }
  
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    // Update document lang attribute
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    // Set initial document lang
    document.documentElement.lang = language;
  }, []);

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Helper hook to get translations
export function useTranslations() {
  const { t } = useI18n();
  return t;
}