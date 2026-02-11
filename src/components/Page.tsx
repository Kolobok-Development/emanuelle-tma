'use client';


import { PropsWithChildren, ReactNode, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNavigation } from './BottomNavigation/BottomNavigation';
import { Header } from './Header/Header';
import { backButton } from '@tma.js/sdk-react';
import { Toaster } from 'react-hot-toast';

const DEBUG_INGEST = 'http://127.0.0.1:7244/ingest/45d7ac2b-2eca-4e94-9301-e674e0d8db0e';

function logLayout(rootEl: HTMLDivElement | null, contentEl: HTMLDivElement | null) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const docW = typeof document !== 'undefined' ? document.documentElement.clientWidth : 0;
  const rootRect = rootEl?.getBoundingClientRect();
  const contentRect = contentEl?.getBoundingClientRect();
  const rootStyle = rootEl ? window.getComputedStyle(rootEl) : null;
  const pl = rootStyle?.paddingLeft ?? '';
  const pr = rootStyle?.paddingRight ?? '';
  const bodyW = typeof document !== 'undefined' ? (document.body?.getBoundingClientRect?.()?.width ?? 0) : 0;
  fetch(DEBUG_INGEST, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Page.tsx:layout', message: 'layout-measure', data: { innerWidth: vw, docClientWidth: docW, bodyWidth: bodyW, rootWidth: rootRect?.width, rootLeft: rootRect?.left, contentWidth: contentRect?.width, contentLeft: contentRect?.left, paddingLeft: pl, paddingRight: pr }, timestamp: Date.now(), hypothesisId: 'H1-H5' }) }).catch(() => {});
}

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
  // #region agent log
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    logLayout(root, content);
    if (!root) return;
    const ro = new ResizeObserver(() => { logLayout(rootRef.current, contentRef.current); });
    ro.observe(root);
    return () => ro.disconnect();
  }, []);
  // #endregion

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
      ref={rootRef}
      className="above-mask flex flex-col min-h-screen min-w-0 overflow-x-hidden"
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
      <div ref={contentRef} className="flex-1 flex min-w-0  pb-[calc(5rem+var(--tg-viewport-safe-area-inset-bottom,0px))] ">
        {children}
      </div>
      <BottomNavigation />
    </div>
  );
}