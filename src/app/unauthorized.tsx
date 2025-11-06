'use client';

import { Subheadline, Title } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { useState } from 'react';

export default function Unauthorized() {
  const t = useTranslations('i18n');
  const router = useRouter();
  const { authenticateUser } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshSession = async () => {
    setIsLoading(true);
    try {
      await authenticateUser();
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // Optionally show error message to user
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex flex-col w-full h-screen items-center justify-center cosmic-background'>
      <div className='flex flex-col w-full h-screen items-center justify-center neon-grid-pattern'>
        <div className="text-center px-6">
          <Title
            level="1"
            weight="3"
            className="mb-4 text-white"
          >
            Session Expired
          </Title>
          
          <Subheadline
            level="2"
            weight="2"
            className="mb-8 text-gray-300"
          >
            Your session has expired. Please refresh to continue.
          </Subheadline>
        </div>

        <div className="absolute bottom-8 left-4 right-4">
          <button
            onClick={handleRefreshSession}
            disabled={isLoading}
            className={`w-full px-6 py-4 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg ${
              isLoading 
                ? 'bg-amber-600 cursor-not-allowed opacity-75' 
                : 'bg-amber-500 hover:bg-amber-600 hover:shadow-xl transform hover:scale-105 active:scale-95'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Refreshing...
              </div>
            ) : (
              'Refresh Session'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
