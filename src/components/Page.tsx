'use client';


import { PropsWithChildren, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNavigation } from './BottomNavigation/BottomNavigation';
import { Header } from './Header/Header';
import { backButton } from '@tma.js/sdk-react';
import { Toaster } from 'react-hot-toast';

export function Page({ children, back = true, showHeader = true, header }: PropsWithChildren<{
  /**
   * True if it is allowed to go back from this page.
   * @default true
   */
  back?: boolean;
  /**
   * Controls visibility of the header.
   * @default true
   */
  showHeader?: boolean;
  /**
   * Custom header content. Falls back to the default header when not provided.
   */
  header?: ReactNode;
}>) {
  const router = useRouter();

  useEffect(() => {
    if (back) {
      backButton.show();
    } else {
      backButton.hide();
    }
  }, [back]);

  useEffect(() => {
    return backButton.onClick(() => {
      router.back();
    });
  }, [router]);

  return (
    <div 
      className="above-mask flex flex-col min-h-screen"
      style={{
        paddingTop: `2rem`,
        paddingLeft: `var(--tg-viewport-safe-area-inset-left, 0px)`,
        paddingRight: `var(--tg-viewport-safe-area-inset-right, 0px)`
      }}
    >
      <Toaster
        position="top-center"
        gutter={8}
        containerClassName=""
        toastOptions={{
          className: '',
          style: {
            background: 'oklch(0.28 0.025 305)',
            color: 'oklch(0.96 0.02 310)',
            border: '1px solid oklch(0.42 0.03 305)',
            borderRadius: '0.75rem',
            padding: '0.875rem 1rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
        }}
        containerStyle={{
          top: 100,
        }}
      />
      {showHeader && (header ?? <Header />)}
      <div className="flex-1 flex  pb-[calc(5rem+var(--tg-viewport-safe-area-inset-bottom,0px))] ">
        {children}
      </div>
      <BottomNavigation />
    </div>
  );
}