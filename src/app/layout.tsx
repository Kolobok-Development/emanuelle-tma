import type { PropsWithChildren } from 'react';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { IBM_Plex_Mono } from 'next/font/google';
import { GoogleTagManager } from '@next/third-parties/google'

import { Root } from '@/components/Root/Root';
import { I18nProvider } from '@/core/i18n/provider';
import { Header } from '@/components/Header/Header';

import './_assets/globals.css';

// Configure Space Mono font
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-ibm-plex-mono',
  
});

export const metadata: Metadata = {
  title: 'Your Application Title Goes Here',
  description: 'Your application description goes here',
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html className={`dark ${ibmPlexMono.variable}`} lang={locale} suppressHydrationWarning >
      <GoogleTagManager gtmId="G-WHPTP00B17" />
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
