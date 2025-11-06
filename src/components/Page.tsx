'use client';

import { backButton } from '@telegram-apps/sdk-react';
import { PropsWithChildren, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNavigation } from './BottomNavigation/BottomNavigation';
import { Header } from './Header/Header';

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
    <div className="above-mask">
      {showHeader && (header ?? <Header />)}
      {children}
      <BottomNavigation />
    </div>
  );
}