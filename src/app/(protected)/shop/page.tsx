'use client';

import { Title, Text } from '@telegram-apps/telegram-ui';

export default function Shop() {
  return (
    <div className="min-h-screen cosmic-background">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Title level="1" className="text-white">Shop</Title>
        <Text className="max-w-sm text-white/80">
          The shop section is currently under development. Please check back soon for new offers.
        </Text>
      </div>
    </div>
  );
}
