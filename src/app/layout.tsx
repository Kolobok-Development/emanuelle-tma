import type { PropsWithChildren } from 'react';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Space_Mono } from 'next/font/google';

import { Root } from '@/components/Root/Root';
import { I18nProvider } from '@/core/i18n/provider';
import { Header } from '@/components/Header/Header';

import '@telegram-apps/telegram-ui/dist/styles.css';
import 'normalize.css/normalize.css';
import './_assets/globals.css';

// Configure Space Mono font
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});


export const metadata: Metadata = {
  title: 'Your Application Title Goes Here',
  description: 'Your application description goes here',
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html className={`dark ${spaceMono.variable}`} lang={locale} suppressHydrationWarning >
      <body>
        <div className='above-mask'>
           <I18nProvider>
          <Root>
            {children}
          </Root>
        </I18nProvider>
        </div>
      </body>
    </html>
  );
}
