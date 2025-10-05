import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User, LogOut, List, Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../utils/translations';

interface User {
  id: string;
  email?: string;
  phone?: string;
  user_metadata: {
    name: string;
    email?: string;
    phone?: string;
  };
}

interface HeaderProps {
  user: User | null;
  onAuthClick: () => void;
  onLogout: () => void;
  onListsClick: () => void;
}

export function Header({ user, onAuthClick, onLogout, onListsClick }: HeaderProps) {
  const { language, setLanguage, t, isRTL } = useLanguage();

  const languageOptions = [
    { value: 'fa' as Language, label: 'فارسی', flag: '🇮🇷' },
    { value: 'en' as Language, label: 'English', flag: '🇺🇸' }
  ];

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Left side - User actions */}
          <div className={`flex items-center gap-2 ${isRTL ? 'order-2' : 'order-1'}`}>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t.welcome}, {user.user_metadata?.name || user.email || user.phone}
                </span>
                <Button variant="outline" size="sm" onClick={onListsClick}>
                  <List className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  {t.lists}
                </Button>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  <LogOut className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  {t.logout}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={onAuthClick}>
                <User className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                {t.loginSignup}
              </Button>
            )}
          </div>

          {/* Center - App title */}
          <div className={`text-center ${isRTL ? 'order-1' : 'order-2'}`}>
            <h1 className="text-2xl font-bold">{t.appTitle}</h1>
            <p className="text-sm text-muted-foreground">{t.appSubtitle}</p>
          </div>

          {/* Right side - Language picker */}
          <div className={`flex items-center gap-2 ${isRTL ? 'order-3' : 'order-3'}`}>
            <Languages className="h-4 w-4 text-muted-foreground" />
            <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.flag}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  );
}