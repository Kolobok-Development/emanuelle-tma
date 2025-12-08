'use client';

import { Title, Text } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';

export default function Tasks() {
  const t = useTranslations();
  return (
    <div className="min-h-screen cosmic-background">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Title level="1" className="text-white">{t('tasks.title')}</Title>
        <Text className="max-w-sm text-white/80">
          {t('tasks.underDevelopment')}
        </Text>
      </div>
    </div>
  );
}
