'use client';

import { Title, Text } from '@telegram-apps/telegram-ui';
import { usePathname } from 'next/navigation';

export const Header = () => {
  const pathname = usePathname();

  const getScreenInfo = () => {
    switch (pathname) {
      case '/':
        return {
          title: 'Привет Игрок',
          subtitle: 'Я соскучилась по тебе!'
        };
      case '/shop':
        return {
          title: 'Магазин',
          subtitle: 'Покупайте предметы для улучшения опыта'
        };
      case '/tasks':
        return {
          title: 'Задания',
          subtitle: 'Выполняйте задания для получения наград'
        };
      case '/profile':
        return {
          title: 'Профиль',
          subtitle: 'Управляйте своим профилем и настройками'
        };
      default:
        return {
          title: 'Привет Игрок',
          subtitle: 'Я соскучилась по тебе!'
        };
    }
  };

  const { title, subtitle } = getScreenInfo();

  return (
    <div className="neon-grid-pattern fade-bottom-50">
      <div className="px-4 py-4">
        <Title level="1" weight="2" className="mb-2 text-white">{title}</Title>
        <Text className="opacity-75 text-white">{subtitle}</Text>
        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="flex items-center bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/30">
            <div className="flex items-center gap-2">
              <span className="text-xs">💎</span>
              <span className="font-bold text-white text-sm">9</span>
            </div>
            <div className="w-px h-4 bg-white/20 mx-3"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs">⚡</span>
              <span className="font-bold text-white text-sm">100</span>
            </div>
          </div>
          <div className="ml-auto">
            <button className="cosmic-button h-9 w-15 px-3 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold relative z-10">+</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
