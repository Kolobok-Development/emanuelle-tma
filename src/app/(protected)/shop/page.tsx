'use client';

import { Title, Text } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';

export default function Shop() {
  const t = useTranslations();
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col gap-4 px-6 text-center">
        <Title level="1" className="text-white">{t('shop.title')}</Title>
        <Text className="max-w-sm text-white/80">
          {t('shop.underDevelopment')}
        </Text>
      </div>
    </div>
  );
}