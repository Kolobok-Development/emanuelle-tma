'use client';

import { Title, Text } from '@telegram-apps/telegram-ui';
import { Page } from '@/components/Page';

export default function Profile() {
  return (
      <div className="min-h-screen cosmic-background">
        <div className="px-4 py-4">
          <Title level="1" className="mb-4 text-white">Профиль</Title>
          <Text className="text-white/80 mb-6">Управляйте своим профилем и настройками</Text>
        </div>
      </div>
  );
}
