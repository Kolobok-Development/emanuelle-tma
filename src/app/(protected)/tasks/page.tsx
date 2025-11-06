'use client';

import { Title, Text } from '@telegram-apps/telegram-ui';

export default function Tasks() {
  return (
    <div className="min-h-screen cosmic-background">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Title level="1" className="text-white">Tasks</Title>
        <Text className="max-w-sm text-white/80">
          The tasks section is currently under development. Stay tuned for upcoming challenges.
        </Text>
      </div>
    </div>
  );
}
