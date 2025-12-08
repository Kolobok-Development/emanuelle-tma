'use client';

import { Title, Text } from '@telegram-apps/telegram-ui';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useAppContext } from '@/context/AppContext';
import { useTranslations } from 'next-intl';

export const Header = () => {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isBalanceRefetching } = useAppContext();

  const getScreenInfo = () => {
    switch (pathname) {
      case '/':
        return {
          title: t('header.home.title'),
          subtitle: t('header.home.subtitle')
        };
      case '/shop':
        return {
          title: t('header.shop.title'),
          subtitle: t('header.shop.subtitle')
        };
      case '/tasks':
        return {
          title: t('header.tasks.title'),
          subtitle: t('header.tasks.subtitle')
        };
      case '/profile':
        return {
          title: t('header.profile.title'),
          subtitle: t('header.profile.subtitle')
        };
      default:
        return {
          title: t('header.home.title'),
          subtitle: t('header.home.subtitle')
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
        <p className='text-sm'>{t('common.hello')}</p>
        <h3 className='text-lg text-transparent bg-clip-text bg-gradient-to-r from-secondary from-0% via-[#DB7AE6] via-50% to-primary to-100%'>{user?.username ?? t('common.player')}</h3>
      </div>
      <div className='relative flex items-center gap-4 bg-border p-2 pr-6 rounded-md'>
        <div className='flex items-center gap-2'>
          <Image objectFit='contain' src="/icons/dimaond.png" alt="Diamond" width={20} height={20} />
          {isBalanceRefetching ? (
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-sm font-bold leading-normal tracking-[0.28px]">{user?.diamonds ?? 0}</p>
          )}
        </div>
        
        <div className='flex items-center gap-2'>
          <Image objectFit='contain' src="/icons/energy.png" alt="Energy" width={20} height={20} />
          {isBalanceRefetching ? (
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-sm font-bold leading-normal tracking-[0.28px]">{user?.energy ?? 0}</p>
          )}
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
