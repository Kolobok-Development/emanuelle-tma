'use client';

import { Title, Text } from '@telegram-apps/telegram-ui';
import { Page } from '@/components/Page';

export default function Tasks() {
  return (
    <Page back={false}>
      <div className="min-h-screen cosmic-background">
        <div className="px-4 py-4">
          <Title level="1" className="mb-4 text-white">Задания</Title>
          <Text className="text-white/80 mb-6">Выполняйте задания для получения наград</Text>
        </div>
      </div>
    </Page>
  );
}
