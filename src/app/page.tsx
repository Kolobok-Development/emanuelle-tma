'use client';
import { Spinner, Subheadline } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import React from 'react';

export default function Home() {
  const t = useTranslations('i18n');
  const { user, isAuthenticated, isLoading } = useAppContext();
  const router = useRouter();


  if (!isAuthenticated && isLoading) {
    return (
        <div className='flex flex-col w-full h-screen items-center justify-center cosmic-background'>
          <div className='flex flex-col w-full h-screen items-center justify-center neon-grid-pattern fade-bottom'> 
            <Spinner className='mb-10 w-10 h-10' size="l" />
            <Subheadline
              level="2"
              weight="2"
            >
              Preparing your session...
            </Subheadline>
          </div>
        </div>
    )
  }

  if (isAuthenticated && user) {
    router.push('/dashboard');
  }

  if (!isAuthenticated && !isLoading) {
    router.push('/unauthorized');
  }

  // Fallback: Show loading while redirecting or if in unexpected state
  return (
    <div className='flex flex-col w-full h-screen items-center justify-center cosmic-background'>
      <div className='flex flex-col w-full h-screen items-center justify-center neon-grid-pattern fade-bottom'> 
        <Spinner className='mb-10 w-10 h-10' size="l" />
        <Subheadline
          level="2"
          weight="2"
        >
          Redirecting...
        </Subheadline>
      </div>
    </div>
  );
}
