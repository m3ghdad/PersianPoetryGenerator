import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

interface AuthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthSheet({ open, onOpenChange }: AuthSheetProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp, resetPassword } = useAuth();
  const { t, isRTL } = useLanguage();

  // Password validation function
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return t.passwordMinLength;
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let result;
      
      if (mode === 'signin') {
        result = await signIn(email, password);
      } else if (mode === 'signup') {
        if (!name.trim()) {
          setError(t.nameRequired);
          return;
        }

        // Validate password
        const passwordError = validatePassword(password);
        if (passwordError) {
          setError(passwordError);
          return;
        }

        // Check password confirmation
        if (password !== confirmPassword) {
          setError(t.passwordMismatch);
          return;
        }

        result = await signUp(email, password, name);
      } else if (mode === 'reset') {
        result = await resetPassword(email);
        if (!result.error) {
          setSuccess(t.resetLinkSent);
          return;
        }
      }

      if (result?.error) {
        // Handle specific error cases with translated messages
        if (result.error.includes('email address has already been registered') || 
            result.error.includes('email_exists')) {
          setError(t.emailAlreadyExists);
          // Auto-suggest switching to sign-in mode after showing the error
          setTimeout(() => {
            if (mode === 'signup') {
              setMode('signin');
              setError('');
              setEmail(email); // Keep the email for convenience
              setPassword('');
              setConfirmPassword('');
            }
          }, 3000);
        } else if (result.error.includes('Invalid login credentials')) {
          setError(t.invalidCredentials);
        } else if (result.error.includes('Email not confirmed')) {
          setError(t.emailNotConfirmed);
        } else if (result.error.includes('Too many requests')) {
          setError(t.tooManyRequests);
        } else {
          // Fallback to original error message
          setError(result.error);
        }
      } else if (mode !== 'reset') {
        onOpenChange(false);
        // Reset form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
      }
    } catch (err) {
      setError(t.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError('');
    setSuccess('');
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'reset') => {
    setMode(newMode);
    resetForm();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] bg-background/95 border-border backdrop-blur-xl p-12 rounded-t-xl">
        <SheetHeader className={isRTL ? "text-right" : "text-left"} dir={isRTL ? "rtl" : "ltr"}>
          <SheetTitle className="text-foreground text-xl">
            {mode === 'signin' && t.signInToAccount}
            {mode === 'signup' && t.createNewAccount}
            {mode === 'reset' && t.resetPassword}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            {mode === 'signin' && t.accessToFavorites}
            {mode === 'signup' && t.createNewUserAccount}
            {mode === 'reset' && t.enterYourEmail}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8" dir={isRTL ? "rtl" : "ltr"}>
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name" className={`text-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t.name}</Label>
              <div className="relative">
                <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground`} size={16} />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`bg-input border-border text-foreground ${isRTL ? 'pl-3 pr-10 text-right' : 'pr-3 pl-10 text-left'}`}
                  placeholder={t.enterName}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className={`text-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t.email}</Label>
            <div className="relative">
              <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground`} size={16} />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`bg-input border-border text-foreground ${isRTL ? 'pl-3 pr-10 text-right' : 'pr-3 pl-10 text-left'}`}
                placeholder={t.enterEmail}
                required
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="space-y-2">
              <Label htmlFor="password" className={`text-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t.password}</Label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground`} size={16} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`bg-input border-border text-foreground ${isRTL ? 'pl-10 pr-10 text-right' : 'pr-10 pl-10 text-left'}`}
                  placeholder={t.enterPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'signup' && (
                <div className={`text-xs text-white/60 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p>{t.passwordRequirements}</p>
                  <ul className={`space-y-0.5 ${isRTL ? 'mr-4' : 'ml-4'}`}>
                    <li className={password.length >= 8 ? 'text-green-400' : 'text-white/60'}>
                      {t.minCharacters}
                    </li>
                    <li className={/[A-Z]/.test(password) ? 'text-green-400' : 'text-white/60'}>
                      {t.upperCase}
                    </li>
                    <li className={/[a-z]/.test(password) ? 'text-green-400' : 'text-white/60'}>
                      {t.lowerCase}
                    </li>
                    <li className={/[0-9]/.test(password) ? 'text-green-400' : 'text-white/60'}>
                      {t.oneNumber}
                    </li>
                    <li className={/[!@#$%^&*(),.?\":{}|<>]/.test(password) ? 'text-green-400' : 'text-white/60'}>
                      {t.specialCharacter}
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className={`text-foreground ${isRTL ? 'text-right' : 'text-left'}`}>{t.confirmPassword}</Label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground`} size={16} />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`bg-input border-border text-foreground ${isRTL ? 'pl-10 pr-10 text-right' : 'pr-10 pl-10 text-left'}`}
                  placeholder={t.enterPasswordAgain}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground`}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && (
                <div className={`text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                  {password === confirmPassword ? (
                    <p className="text-green-400">{t.passwordsMatch}</p>
                  ) : (
                    <p className="text-red-400">{t.passwordsDontMatch}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className={`text-red-400 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>
              {error.includes(isRTL ? 'این ایمیل قبلاً ثبت شده است' : 'already registered') && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline transition-colors"
                >
                  {t.signInNow}
                </button>
              )}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className={`text-green-400 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{success}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {loading ? t.processing : (
              mode === 'signin' ? t.signIn :
              mode === 'signup' ? t.createAccount :
              t.sendResetLink
            )}
          </Button>

          <div className="flex flex-col space-y-2 text-center">
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t.dontHaveAccount} {t.createAccountLink}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t.forgotPassword}
                </button>
              </>
            )}

            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {t.haveAccount} {t.signInLink}
              </button>
            )}

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {t.backToSignIn}
              </button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}