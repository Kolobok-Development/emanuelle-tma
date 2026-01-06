'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/context/AppContext';
import { localesMap } from '@/core/i18n/config';
import { setLocale } from '@/core/i18n/locale';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';

export default function Profile() {
  const t = useTranslations();
  const { user, refetchUser } = useAppContext();
  const [promocode, setPromocode] = useState('');
  const [username, setUsername] = useState('');
  const [language, setLanguage] = useState('en');
  const [isApplyingPromocode, setIsApplyingPromocode] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);

  // Initialize form values from user data
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      // Get language from settings if available (from API response)
      const userWithSettings = user as any;
      setLanguage(userWithSettings.settings?.language || 'en');
    }
  }, [user]);

  const handleApplyPromocode = async () => {
    if (!promocode.trim()) {
      toast.error(t('toasts.promocode.enterPromocode'));
      return;
    }

    setIsApplyingPromocode(true);
    try {
      const response = await fetch('/api/profile/apply-promocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ promocode: promocode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Map API error messages to translation keys
        const errorKey = data.error === 'Invalid promocode' ? 'api.errors.invalidPromocode' :
                        data.error === 'This promocode is no longer active' ? 'api.errors.inactivePromocode' :
                        data.error === 'This promocode has expired' ? 'api.errors.expiredPromocode' :
                        data.error === 'You have already used this promocode' ? 'api.errors.alreadyUsedPromocode' :
                        data.error === 'This promocode has reached its usage limit' ? 'api.errors.usageLimitReached' :
                        'toasts.promocode.applyFailed';
        toast.error(t(errorKey));
        return;
      }

      toast.success(data.message || t('toasts.promocode.applySuccess'));
      setPromocode('');
      // Refetch user to update balance
      await refetchUser();
    } catch (error) {
      console.error('Error applying promocode:', error);
      toast.error(t('toasts.promocode.applyFailed'));
    } finally {
      setIsApplyingPromocode(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      toast.error(t('toasts.username.enterUsername'));
      return;
    }

    setIsSavingUsername(true);
    try {
      const response = await fetch('/api/profile/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || t('toasts.username.saveFailed'));
        return;
      }

      toast.success(t('toasts.username.saveSuccess'));
      await refetchUser();
    } catch (error) {
      console.error('Error saving username:', error);
      toast.error(t('toasts.username.saveFailed'));
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    setIsSavingLanguage(true);
    try {
      const response = await fetch('/api/profile/update-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language: newLanguage }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || t('toasts.language.updateFailed'));
        const userWithSettings = user as any;
        setLanguage(userWithSettings?.settings?.language || 'en'); // Revert on error
        return;
      }

      toast.success(t('toasts.language.updateSuccess'));
      // Update locale in the app
      await setLocale(newLanguage);
      await refetchUser();
    } catch (error) {
      console.error('Error updating language:', error);
      toast.error(t('toasts.language.updateFailed'));
      const userWithSettings = user as any;
      setLanguage(userWithSettings?.settings?.language || 'en'); // Revert on error
    } finally {
      setIsSavingLanguage(false);
    }
  };

  return (
    <div className="relative flex flex-col px-4 py-6 gap-6">
      {/* Promocode Section */}
      <Card className="bg-muted-dark border-border">
        <CardHeader>
          <CardTitle className="text-white text-lg font-bold">{t('profile.promocode.title')}</CardTitle>
          <CardDescription className="text-white/70 text-sm">
            {t('profile.promocode.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={t('profile.promocode.placeholder')}
              value={promocode}
              onChange={(e) => setPromocode(e.target.value.toUpperCase())}
              className="flex-1 bg-background border-border text-white placeholder:text-white/50"
              disabled={isApplyingPromocode}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyPromocode();
                }
              }}
            />
            <Button
              onClick={handleApplyPromocode}
              disabled={isApplyingPromocode || !promocode.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              {isApplyingPromocode ? t('profile.promocode.applying') : t('profile.promocode.apply')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Username Section */}
      <Card className="bg-muted-dark border-border">
        <CardHeader>
          <CardTitle className="text-white text-lg font-bold">{t('profile.username.title')}</CardTitle>
          <CardDescription className="text-white/70 text-sm">
            {t('profile.username.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={t('profile.username.placeholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 bg-background border-border text-white placeholder:text-white/50"
              disabled={isSavingUsername}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveUsername();
                }
              }}
            />
            <Button
              onClick={handleSaveUsername}
              disabled={isSavingUsername || !username.trim() || username === user?.username}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              {isSavingUsername ? t('profile.username.saving') : t('profile.username.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language Section */}
      <Card className="bg-muted-dark border-border">
        <CardHeader>
          <CardTitle className="text-white text-lg font-bold">{t('profile.language.title')}</CardTitle>
          <CardDescription className="text-white/70 text-sm">
            {t('profile.language.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={language}
            onValueChange={handleLanguageChange}
            disabled={isSavingLanguage}
          >
            <SelectTrigger className="w-full bg-background border-border text-white hover:bg-background/80">
              <SelectValue placeholder={t('profile.language.placeholder')} />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {localesMap.map((locale) => (
                <SelectItem
                  key={locale.key}
                  value={locale.key}
                  className="text-white cursor-pointer focus:bg-accent focus:text-accent-foreground"
                >
                  {locale.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
