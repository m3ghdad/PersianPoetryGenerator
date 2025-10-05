import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Mail, Phone, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, accessToken: string) => void;
}



export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { t, isRTL } = useLanguage();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [authStep, setAuthStep] = useState<'input' | 'verify'>('input');
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    verificationCode: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend code
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      verificationCode: ''
    });
    setAuthStep('input');
    setLoading(false);
    setCountdown(0);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authType === 'signup') {
        // Validate signup data
        if (!formData.name.trim()) {
          toast.error(t.nameRequired);
          return;
        }
        
        if (authMethod === 'email' && !formData.email) {
          toast.error(t.emailRequired);
          return;
        }
        
        if (authMethod === 'phone' && !formData.phone) {
          toast.error(t.phoneRequired);
          return;
        }

        if (formData.password.length < 6) {
          toast.error(t.passwordMinLength);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          toast.error(t.passwordMismatch);
          return;
        }
      }

      // Use the new server endpoint for OTP
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email: authMethod === 'email' ? formData.email : undefined,
          phone: authMethod === 'phone' ? formData.phone : undefined,
          authType
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        toast.error(t.sendCodeError + ': ' + result.error);
        return;
      }

      toast.success(`${t.codeSent} ${authMethod === 'email' ? t.email : t.phone}`);
      setAuthStep('verify');
      startCountdown();
    } catch (error) {
      console.error('Send code error:', error);
      toast.error(t.sendCodeError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.verificationCode || formData.verificationCode.length !== 6) {
        toast.error(t.invalidCode);
        return;
      }

      // Use the new server endpoint for verification
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email: authMethod === 'email' ? formData.email : undefined,
          phone: authMethod === 'phone' ? formData.phone : undefined,
          token: formData.verificationCode,
          name: authType === 'signup' ? formData.name : undefined,
          authType
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        toast.error(t.invalidCode);
        return;
      }

      if (result.session?.access_token) {
        toast.success(authType === 'signup' ? t.signupSuccess : t.loginSuccess);
        onSuccess(result.user, result.session.access_token);
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('Verify code error:', error);
      toast.error(t.verifyCodeError);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email: authMethod === 'email' ? formData.email : undefined,
          phone: authMethod === 'phone' ? formData.phone : undefined,
          authType
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        toast.error(t.resendCodeError);
        return;
      }

      toast.success(t.codeResent);
      startCountdown();
    } catch (error) {
      console.error('Resend code error:', error);
      toast.error(t.resendCodeError);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToInput = () => {
    setAuthStep('input');
    setFormData(prev => ({ ...prev, verificationCode: '' }));
    setCountdown(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {authStep === 'input' ? t.loginSignup : t.verificationCode}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {authStep === 'input' ? 'ورود یا ثبت نام در حساب کاربری' : 'وارد کردن کد تایید ارسال شده'}
          </DialogDescription>
        </DialogHeader>

        {authStep === 'input' ? (
          <div className="space-y-6">
            {/* Auth Type Selection */}
            <Tabs value={authType} onValueChange={(value: string) => setAuthType(value as 'login' | 'signup')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t.login}</TabsTrigger>
                <TabsTrigger value="signup">{t.signup}</TabsTrigger>
              </TabsList>

              <TabsContent value={authType} className="space-y-4 mt-6">
                {/* Contact Method Selection */}
                <div className="space-y-2">
                  <Label>{t.contactMethod}</Label>
                  <Select value={authMethod} onValueChange={(value: string) => setAuthMethod(value as 'email' | 'phone')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {t.email}
                        </div>
                      </SelectItem>
                      <SelectItem value="phone">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {t.phone}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <form onSubmit={handleSendCode} className="space-y-4">
                  {authType === 'signup' && (
                    <div className="space-y-2">
                      <Label htmlFor="name">{t.name}</Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder={t.namePlaceholder}
                      />
                    </div>
                  )}

                  {authMethod === 'email' ? (
                    <div className="space-y-2">
                      <Label htmlFor="email">{t.email}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder={t.emailPlaceholder}
                        dir="ltr"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t.phone}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        placeholder={t.phonePlaceholder}
                        dir="ltr"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t.phoneHint}
                      </p>
                    </div>
                  )}

                  {authType === 'signup' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="password">{t.password}</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                          placeholder={t.passwordPlaceholder}
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">{t.confirmPassword}</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          required
                          placeholder={t.confirmPasswordPlaceholder}
                          dir="ltr"
                        />
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t.sending : `${t.sendCode} ${authMethod === 'email' ? t.email : t.phone}`}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToInput}
                className="mb-2"
              >
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                {t.back}
              </Button>
              <p className="text-sm text-muted-foreground">
                {t.codeSent} {authMethod === 'email' ? `${t.email} ${formData.email}` : `${t.phone} ${formData.phone}`}
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">{t.verificationCode}</Label>
                <Input
                  id="verification-code"
                  type="text"
                  value={formData.verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormData({ ...formData, verificationCode: value });
                  }}
                  required
                  placeholder={t.verificationCodePlaceholder}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  dir="ltr"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || formData.verificationCode.length !== 6}>
                {loading ? t.verifying : t.verifyCode}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || loading}
                >
                  {countdown > 0 ? `${t.resendCode} (${countdown}s)` : t.resendCode}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}