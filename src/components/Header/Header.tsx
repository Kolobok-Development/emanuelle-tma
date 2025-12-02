'use client';

import { Title, Text } from '@telegram-apps/telegram-ui';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

export const Header = () => {
  const pathname = usePathname();
  const router = useRouter();

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
    <Card 
      className='flex flex-row justify-between items-center w-full bg-muted p-4 pr-6 pl-6'
      style={{
        marginTop: `calc(var(--tg-viewport-safe-area-inset-top, 0px) + 4rem)`,
      }}
    > 
      <div className='flex flex-col'>
        <p className='text-sm'>Good Morning</p>
        <h3 className='text-lg text-transparent bg-clip-text bg-gradient-to-r from-secondary from-0% via-[#DB7AE6] via-50% to-primary to-100%'>Maximilian</h3>
      </div>
      <div className='relative flex items-center gap-4 bg-border p-2 pr-6 rounded-md'>
        <div className='flex items-center gap-2'>
          <Image objectFit='contain' src="/icons/dimaond.png" alt="Diamond" width={20} height={20} />
          <p className="text-sm font-bold leading-normal tracking-[0.28px]">50</p>
        </div>
        
        <div className='flex items-center gap-2'>
          <Image objectFit='contain' src="/icons/energy.png" alt="Energy" width={20} height={20} />
          <p className="text-sm font-bold leading-normal tracking-[0.28px]">100</p>
        </div>
        
        <Button
          type="button"
          onClick={() => {
            if (pathname !== '/balance') {
              router.push('/balance');
            }
          }}
          className='absolute -right-4 top-1/2 -translate-y-1/2 bg-primary w-8 h-8 p-0 flex items-center justify-center rounded-md z-10'
        >
          <span className='text-white font-bold'>+</span>
        </Button>
      </div>
    </Card>
  );
};
