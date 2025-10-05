import { useLanguage } from '../contexts/LanguageContext';

export function LanguageButton() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'fa' ? 'en' : 'fa');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="w-10 h-10 rounded-full shadow-2xl backdrop-blur-xl border border-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          inset 0 -1px 0 rgba(0, 0, 0, 0.1)
        `,
      }}
      aria-label={`Switch to ${language === 'fa' ? 'English' : 'فارسی'}`}
    >
      <div className="flex items-center justify-center h-full">
        <span className="text-white font-medium text-xs tracking-wider">
          {language === 'fa' ? 'FA' : 'EN'}
        </span>
      </div>
    </button>
  );
}